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

def build_registry():
    print("Starting full registry build (scanning all_skills + repos + paperclip skills)...", flush=True)
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
                    
                    # Package details
                    package_data = {
                        "name": name,
                        "slug": slug,
                        "description": description,
                        "content": prompt_content,
                        "version": "1.0.0",
                        "metadata": meta
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
                        "version": "1.0.0"
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
