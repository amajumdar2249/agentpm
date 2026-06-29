DROP TABLE IF EXISTS skills;

CREATE TABLE skills (
  id TEXT PRIMARY KEY,          -- e.g. 'react-expert'
  name TEXT NOT NULL,
  description TEXT,
  author TEXT,
  version TEXT DEFAULT '1.0.0',
  content TEXT NOT NULL,        -- The full SKILL.md markdown
  tags TEXT,                    -- JSON array of strings
  quality_score INTEGER DEFAULT 80,
  trust_score INTEGER DEFAULT 100,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_skills_name ON skills(name);
