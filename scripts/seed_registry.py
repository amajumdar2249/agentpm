import os
import json
import re
import sys

# Paths
skills_dirs = [
    r"c:\Users\amaju\Downloads\GitHub Repo's\skills_sh_extracted",
    r"c:\Users\amaju\Downloads\GitHub Repo's\paperclip-master\paperclip-master\skills",
    r"c:\Users\amaju\Downloads\GitHub Repo's\ECC-main\ECC-main\skills",
    r"c:\Users\amaju\Downloads\GitHub Repo's\andrej-karpathy-skills-main\andrej-karpathy-skills-main\skills"
]
output_dir = r"c:\Users\amaju\Downloads\agentpm\registry"
index_output = os.path.join(output_dir, "index.json")
packages_dir = os.path.join(output_dir, "packages")

# Ensure output directories exist
os.makedirs(packages_dir, exist_ok=True)

def parse_frontmatter(content):
    meta = {}
    lines = content.split('\n')
    if len(lines) > 1 and lines[0].strip() == '---':
        fm_lines = []
        idx = 1
        while idx < len(lines) and lines[idx].strip() != '---':
            fm_lines.append(lines[idx])
            idx += 1
        
        # Parse YAML-like lines
        for fm_line in fm_lines:
            if ':' in fm_line:
                parts = fm_line.split(':', 1)
                if len(parts) == 2:
                    key, val = parts
                    meta[key.strip()] = val.strip().strip('"').strip("'")
        
        # Remaining content
        remaining = '\n'.join(lines[idx+1:])
        return meta, remaining
    return {}, content

def fetch_github_reviews():
    import urllib.request
    import urllib.error
    reviews = {}
    url = "https://api.github.com/repos/amajumdar2249/agentpm-registry/issues?state=all&per_page=100"
    headers = {"User-Agent": "AgentPM-Registry-Builder"}
    
    print("Fetching community ratings and reviews from GitHub Issues...", flush=True)
    try:
        req = urllib.request.Request(url, headers=headers)
        # 5 second timeout to prevent blocking during offline local dev builds
        with urllib.request.urlopen(req, timeout=5) as response:
            issues = json.loads(response.read().decode('utf-8'))
            
            for issue in issues:
                title = issue.get("title", "")
                body = issue.get("body", "") or ""
                
                # Check for review pattern in title: "[Review] slug"
                if title.startswith("[Review]"):
                    slug = title.replace("[Review]", "").strip().lower()
                    # Parse rating (e.g., 5/5 or **5**/5)
                    match = re.search(r'Rating:\s*\*?(\d)\*?\s*/\s*5', body, re.IGNORECASE)
                    if match:
                        rating = int(match.group(1))
                        if 1 <= rating <= 5:
                            if slug not in reviews:
                                reviews[slug] = []
                            reviews[slug].append(rating)
                            
            print(f"Successfully loaded reviews for {len(reviews)} packages.", flush=True)
    except Exception as e:
        print(f"[Warning] Could not fetch reviews from GitHub API (proceeding with default ratings): {e}", flush=True)
        
    return reviews

def build_registry():
    print("Starting full registry build (scanning all_skills + repos + paperclip skills)...", flush=True)
    
    # Fetch ratings from GitHub issues
    reviews = fetch_github_reviews()
    
    index_data = []
    seen_slugs = {}
    processed_count = 0
    
    for s_dir in skills_dirs:
        print(f"Scanning directory: {s_dir}", flush=True)
        for root, dirs, files in os.walk(s_dir):
            # Ignore .git directories to save scan time
            if '.git' in dirs:
                dirs.remove('.git')
                
            if "SKILL.md" in files:
                skill_path = os.path.join(root, "SKILL.md")
                try:
                    with open(skill_path, "r", encoding="utf-8", errors="ignore") as f:
                        raw_content = f.read()
                
                    meta, prompt_content = parse_frontmatter(raw_content)
                    
                    name = meta.get("name")
                    if not name:
                        name = os.path.basename(root)
                    
                    description = meta.get("description", "AI agent skill playbook")
                    
                    # Base slug
                    base_slug = name.lower().replace("@", "").replace("/", "-").replace(" ", "-").strip("-")
                    base_slug = re.sub(r'[^a-z0-9\-]', '', base_slug) # clean slug chars
                    
                    # De-duplicate slug
                    slug = base_slug
                    if slug in seen_slugs:
                        seen_slugs[base_slug] += 1
                        slug = f"{base_slug}-{seen_slugs[base_slug]}"
                    else:
                        seen_slugs[base_slug] = 1
                    
                    # Compute ratings based on scraped GitHub Issues
                    pkg_reviews = reviews.get(slug, [])
                    total_ratings = len(pkg_reviews)
                    avg_rating = sum(pkg_reviews) / total_ratings if total_ratings > 0 else 0.0
                    trust_score = 100 - (pkg_reviews.count(1) * 20 + pkg_reviews.count(2) * 10) # deduct for poor ratings
                    trust_score = max(min(trust_score, 100), 0)
                    
                    ratings_data = {
                        "average_rating": round(avg_rating, 2),
                        "total_ratings": total_ratings,
                        "review_count": total_ratings,
                        "quality_score": 80 if total_ratings == 0 else min(80 + total_ratings * 2, 100),
                        "trust_score": trust_score
                    }
                    
                    # Package details (Standard Schema)
                    package_data = {
                        "id": meta.get("id", f"f81d4fae-7dec-11d0-a765-{processed_count:012d}"), # fallback id
                        "name": name,
                        "slug": slug,
                        "description": description,
                        "content": prompt_content,
                        "author": meta.get("author", "agentpm"),
                        "version": meta.get("version", "1.0.0"),
                        "created_at": meta.get("created_at", "2026-05-30T00:00:00Z"),
                        "updated_at": meta.get("updated_at", "2026-05-30T00:00:00Z"),
                        "license": meta.get("license", "MIT"),
                        "category": meta.get("category", "automation"),
                        "tags": [t.strip() for t in meta.get("tags", "").split(",") if t.strip()] or ["agent"],
                        "difficulty_level": meta.get("difficulty_level", "intermediate"),
                        "maturity_level": meta.get("maturity_level", "stable"),
                        "compatibility": {
                            "engines": ["generic"]
                        },
                        "dependencies": {},
                        "examples": {
                            "success_cases": [],
                            "failure_cases": [],
                            "edge_cases": [],
                            "best_practices": []
                        },
                        "ratings": ratings_data,
                        "analytics": {
                            "downloads": 0,
                            "installs": 0,
                            "executions": 0,
                            "active_users": 0
                        }
                    }
                    
                    # Write individual package file
                    pkg_file = os.path.join(packages_dir, f"{slug}.json")
                    with open(pkg_file, "w", encoding="utf-8") as f_pkg:
                        json.dump(package_data, f_pkg, indent=2)
                    
                    # Add to index
                    index_data.append({
                        "name": name,
                        "slug": slug,
                        "description": description,
                        "version": package_data["version"],
                        "tags": package_data["tags"],
                        "ratings": ratings_data
                    })
                    
                    processed_count += 1
                    
                    # Write index periodically
                    if processed_count % 1000 == 0:
                        with open(index_output, "w", encoding="utf-8") as f_idx:
                            json.dump(index_data, f_idx, indent=2)
                        print(f"Processed {processed_count} skills. Registry index updated.", flush=True)
                        
                except Exception as e:
                    print(f"Error processing {skill_path}: {e}", flush=True)
 
    # Write final index file
    with open(index_output, "w", encoding="utf-8") as f_idx:
        json.dump(index_data, f_idx, indent=2)
        
    print(f"\nSuccessfully compiled full registry index!", flush=True)
    print(f"Total skills registered: {processed_count}", flush=True)
    print(f"Index written to: {index_output}", flush=True)
    print(f"Individual packages compiled in: {packages_dir}", flush=True)
 
if __name__ == "__main__":
    build_registry()
