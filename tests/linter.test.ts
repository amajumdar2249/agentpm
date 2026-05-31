import { SkillLinter } from '../src/linter';
import fs from 'fs';
import path from 'path';

describe('SkillLinter Validation', () => {
  const validSkill = {
    id: "f81d4fae-7dec-11d0-a765-00a0c91e6bf6",
    name: "React Performance Optimizer",
    slug: "react-perf-optimizer",
    description: "An expert AI persona specializing in profiling and optimizing complex React rendering pathways.",
    content: "You are a master of React hook profiling and fiber tree optimization...",
    author: "Jane Doe",
    organization: "OpenSource Agents",
    version: "1.0.0",
    created_at: "2026-05-31T05:00:00Z",
    updated_at: "2026-05-31T05:00:00Z",
    license: "MIT",
    repository_url: "https://github.com/example/react-perf",
    category: "frontend",
    tags: ["react", "typescript", "performance"],
    difficulty_level: "expert",
    maturity_level: "stable",
    compatibility: {
      engines: ["cursor", "claude-code"],
      min_engine_version: "1.0.0"
    },
    dependencies: {
      "typescript-advanced-types": "^1.0.0"
    },
    examples: {
      success_cases: [
        {
          title: "Optimize Context render",
          input: "Please optimize my context selector hooks.",
          output: "Here is the memoized selector using react-compiler conventions...",
          is_success: true
        }
      ],
      failure_cases: [],
      edge_cases: [],
      best_practices: [
        "Avoid raw context providers for high frequency updates",
        "Use split contexts for state and dispatch"
      ]
    },
    ratings: {
      average_rating: 4.8,
      total_ratings: 42,
      review_count: 10,
      quality_score: 95,
      trust_score: 99
    },
    analytics: {
      downloads: 1250,
      installs: 890,
      executions: 4500,
      active_users: 320
    }
  };

  it('should successfully validate a fully compliant skill metadata object', () => {
    const result = SkillLinter.validate(validSkill);
    expect(result.isValid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should fail validation if required fields are missing', () => {
    const invalidSkill = { ...validSkill } as any;
    delete invalidSkill.id;
    delete invalidSkill.name;

    const result = SkillLinter.validate(invalidSkill);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual(expect.stringContaining('[id]: Required'));
    expect(result.errors).toContainEqual(expect.stringContaining('[name]: Required'));
  });

  it('should fail validation if fields do not match formats or boundaries', () => {
    const invalidSkill = {
      ...validSkill,
      slug: "React_Perf_Optimizer", // invalid characters
      version: "1.0", // invalid semver format
      difficulty_level: "god-mode", // invalid enum value
      ratings: {
        ...validSkill.ratings,
        average_rating: 5.5 // out of bounds 0-5
      }
    } as any;

    const result = SkillLinter.validate(invalidSkill);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual(expect.stringContaining('[slug]: Slug must be lowercase alphanumeric and hyphens only'));
    expect(result.errors).toContainEqual(expect.stringContaining('[version]: Version must be a valid semantic version'));
    expect(result.errors).toContainEqual(expect.stringContaining('[difficulty_level]: Invalid enum value'));
    expect(result.errors).toContainEqual(expect.stringContaining('[ratings.average_rating]: Number must be less than or equal to 5'));
  });

  it('should validate file contents successfully from disk', () => {
    const tmpPath = path.join(__dirname, 'mock-skill.json');
    fs.writeFileSync(tmpPath, JSON.stringify(validSkill, null, 2), 'utf8');

    const result = SkillLinter.validateFile(tmpPath);
    expect(result.isValid).toBe(true);

    // cleanup
    fs.unlinkSync(tmpPath);
  });

  it('should return error if file does not exist on disk', () => {
    const nonExistentPath = path.join(__dirname, 'ghost-skill.json');
    const result = SkillLinter.validateFile(nonExistentPath);
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('File does not exist');
  });
});
