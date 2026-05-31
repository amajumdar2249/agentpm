"use client";

import { useState, useEffect, useRef } from "react";
import MiniSearch from "minisearch";

interface SkillItem {
  id?: string;
  name: string;
  slug: string;
  description: string;
  version: string;
  tags: string[];
  ratings?: {
    average_rating: number;
    total_ratings: number;
    review_count: number;
    quality_score: number;
    trust_score: number;
  };
  score?: number;
}

export default function Marketplace() {
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [results, setResults] = useState<SkillItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<SkillItem | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  
  const searchIndexRef = useRef<MiniSearch | null>(null);

  // Load and Index skills on mount
  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const res = await fetch(
          "https://raw.githubusercontent.com/amajumdar2249/agentpm-registry/main/index.json"
        );
        if (!res.ok) {
          throw new Error("Failed to retrieve packages from Global Registry CDN.");
        }
        const data = await res.json();
        
        // Ensure every item matches SkillItem interface and has unique ID
        const normalizedData: SkillItem[] = data.map((item: any, idx: number) => ({
          id: item.id || item.slug || `skill-${idx}`,
          name: item.name || "",
          slug: item.slug || "",
          description: item.description || "AI agent skill playbook",
          version: item.version || "1.0.0",
          tags: Array.isArray(item.tags) ? item.tags : ["agent"],
          ratings: item.ratings || {
            average_rating: 0,
            total_ratings: 0,
            review_count: 0,
            quality_score: 80,
            trust_score: 100
          }
        }));

        setSkills(normalizedData);
        setResults(normalizedData.slice(0, 18)); // Default first 18 skills

        // Initialize MiniSearch indexing
        const searchIndex = new MiniSearch({
          fields: ["name", "slug", "description", "tags"],
          storeFields: ["id", "name", "slug", "description", "version", "tags", "ratings"],
          searchOptions: {
            boost: { name: 3, tags: 2, slug: 1.5, description: 1 },
            fuzzy: 0.4,
            prefix: true
          }
        });
        
        // Remove duplicates from indexing
        const seenIds = new Set<string>();
        const uniqueDocs = normalizedData.filter(doc => {
          const uniqueId = doc.id as string;
          if (!seenIds.has(uniqueId)) {
            seenIds.add(uniqueId);
            return true;
          }
          return false;
        });

        searchIndex.addAll(uniqueDocs);
        searchIndexRef.current = searchIndex;
        
        setLoading(false);
      } catch (err) {
        setError((err as Error).message);
        setLoading(false);
      }
    };

    fetchSkills();
  }, []);

  // Handle live search matching
  useEffect(() => {
    if (!searchIndexRef.current) return;
    
    if (searchQuery.trim() === "") {
      setResults(skills.slice(0, 18)); // default fallback list
      return;
    }

    const searchResults = searchIndexRef.current.search(searchQuery);
    const mappedResults = searchResults.map(res => ({
      id: res.id,
      name: res.name,
      slug: res.slug,
      description: res.description,
      version: res.version,
      tags: res.tags,
      ratings: res.ratings,
      score: res.score
    }));

    setResults(mappedResults);
  }, [searchQuery, skills]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const renderStars = (rating: number) => {
    const starsCount = Math.round(rating || 0);
    return (
      <span className="stars" title={`Rating: ${rating}/5`}>
        {"★".repeat(starsCount)}
        {"☆".repeat(5 - starsCount)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="loading-wrapper">
        <div className="spinner"></div>
        <p style={{ color: "#a0a0b0" }}>Synchronizing with Global AI Registry database...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="loading-wrapper">
        <p style={{ color: "#ff1744", fontSize: "1.2rem", fontWeight: "bold" }}>⚠️ Registry Connection Failed</p>
        <p style={{ color: "#a0a0b0", marginTop: "0.5rem" }}>{error}</p>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Decorative Glow Blobs */}
      <div className="glow-effect glow-top-right"></div>
      <div className="glow-effect glow-bottom-left"></div>

      {/* Header */}
      <header>
        <h1>AgentPM Marketplace</h1>
        <p>The global registry to discover, audit, and orchestrate audited AI personas & skills.</p>
        
        <div className="badge-container">
          <div className="badge badge-green">
            <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#00c853" }}></span>
            Registry Online
          </div>
          <div className="badge">
            📦 {skills.length.toLocaleString()} Skills Indexed
          </div>
        </div>
      </header>

      {/* Search Input Box */}
      <div className="search-wrapper">
        <span className="search-icon">🔎</span>
        <input
          type="text"
          className="search-input"
          placeholder="Fuzzy search skills (e.g. react optimiser, aws builder, cybersecurity)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Results Title */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem", color: "#a0a0b0" }}>
        <span>
          {searchQuery ? `Search results for "${searchQuery}"` : "Featured AI Packages"}
        </span>
        <span>Showing {results.length} results</span>
      </div>

      {/* Grid List */}
      {results.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "#62627a" }}>
          <p style={{ fontSize: "1.2rem" }}>No matching skills found in the Neural Registry.</p>
          <p style={{ fontSize: "0.9rem", marginTop: "0.5rem" }}>Try adjusting your keywords or search tags.</p>
        </div>
      ) : (
        <div className="skills-grid">
          {results.map((skill) => (
            <div key={skill.id} className="card" onClick={() => setSelectedSkill(skill)}>
              <div className="card-header">
                <span className="card-title" title={skill.name}>{skill.name}</span>
                <span className="card-version">v{skill.version}</span>
              </div>
              
              <p className="card-desc">{skill.description}</p>
              
              <div className="card-footer">
                <div className="tags">
                  {skill.tags.slice(0, 2).map((tag, i) => (
                    <span key={i} className="tag">{tag}</span>
                  ))}
                  {skill.tags.length > 2 && <span className="tag">+{skill.tags.length - 2}</span>}
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                  {skill.ratings && skill.ratings.total_ratings > 0 ? (
                    <>
                      {renderStars(skill.ratings.average_rating)}
                      <span style={{ fontSize: "0.75rem", color: "#62627a" }}>({skill.ratings.total_ratings})</span>
                    </>
                  ) : (
                    <span style={{ fontSize: "0.75rem", color: "#62627a" }}>Unrated</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Skill Detailed Modal Overlay */}
      {selectedSkill && (
        <div className="modal-overlay" onClick={() => setSelectedSkill(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedSkill(null)}>×</button>
            
            <div className="modal-header">
              <h2>{selectedSkill.name}</h2>
              <p style={{ color: "#a0a0b0" }}>Slug: <code style={{ color: "#b273ff" }}>{selectedSkill.slug}</code></p>
              
              <div className="modal-meta-row">
                <span>Version: v{selectedSkill.version}</span>
                <span>Category: {selectedSkill.tags[0] || "General"}</span>
                {selectedSkill.ratings && (
                  <span style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    Rating: {renderStars(selectedSkill.ratings.average_rating)}
                  </span>
                )}
              </div>
            </div>

            {/* Click-to-Copy CLI install command */}
            <div 
              className="install-command" 
              onClick={() => copyToClipboard(`agentpm install ${selectedSkill.slug}`)}
              title="Click to copy CLI command"
            >
              <span>$ agentpm install {selectedSkill.slug}</span>
              <span className="copy-btn">{copySuccess ? "Copied! ✓" : "Copy"}</span>
            </div>

            <div className="modal-section">
              <h3>Description</h3>
              <p className="modal-desc">{selectedSkill.description}</p>
            </div>

            <div className="modal-section">
              <h3>Classification Tags</h3>
              <div className="modal-tags">
                {selectedSkill.tags.map((tag, i) => (
                  <span key={i} className="tag" style={{ fontSize: "0.85rem", padding: "0.25rem 0.75rem" }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {selectedSkill.ratings && (
              <div className="modal-section" style={{ display: "flex", gap: "2rem", background: "rgba(255,255,255,0.03)", padding: "1.5rem", borderRadius: "12px" }}>
                <div>
                  <h4 style={{ color: "#a0a0b0", fontSize: "0.8rem", textTransform: "uppercase" }}>Trust Score</h4>
                  <p style={{ color: selectedSkill.ratings.trust_score >= 80 ? "#00c853" : "#ffd600", fontSize: "2rem", fontWeight: "bold" }}>
                    {selectedSkill.ratings.trust_score}%
                  </p>
                </div>
                <div>
                  <h4 style={{ color: "#a0a0b0", fontSize: "0.8rem", textTransform: "uppercase" }}>Quality Rating</h4>
                  <p style={{ color: "#ffffff", fontSize: "2rem", fontWeight: "bold" }}>
                    {selectedSkill.ratings.quality_score}/100
                  </p>
                </div>
                <div>
                  <h4 style={{ color: "#a0a0b0", fontSize: "0.8rem", textTransform: "uppercase" }}>Total Reviews</h4>
                  <p style={{ color: "#ffffff", fontSize: "2rem", fontWeight: "bold" }}>
                    {selectedSkill.ratings.review_count}
                  </p>
                </div>
              </div>
            )}

            <div style={{ marginTop: "3rem", display: "flex", gap: "1rem" }}>
              <button 
                onClick={() => window.open(`https://github.com/amajumdar2249/agentpm-registry/issues/new?title=%5BReview%5D+${selectedSkill.slug}&body=Rating%3A+5%2F5%0A%0AComments...`)}
                style={{ 
                  flex: 1, 
                  background: "linear-gradient(90deg, #8a2be2 0%, #4a00e0 100%)", 
                  border: "none", 
                  padding: "1rem", 
                  color: "white", 
                  borderRadius: "8px", 
                  fontWeight: "bold", 
                  cursor: "pointer",
                  transition: "opacity 0.2s"
                }}
              >
                Rate This Skill ⭐️
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
