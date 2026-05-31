import { z } from 'zod';

export const CompatibilitySchema = z.object({
  engines: z.array(z.enum(['claude-code', 'cursor', 'windsurf', 'copilot', 'generic'])),
  min_engine_version: z.string().optional(),
});

export const DependencySchema = z.record(z.string()); // skill-slug -> version range (e.g. "^1.0.0")

export const ExampleUseCaseSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  input: z.string(),
  output: z.string(),
  is_success: z.boolean(),
  notes: z.string().optional(),
});

export const ExampleLibrarySchema = z.object({
  success_cases: z.array(ExampleUseCaseSchema).default([]),
  failure_cases: z.array(ExampleUseCaseSchema).default([]),
  edge_cases: z.array(ExampleUseCaseSchema).default([]),
  best_practices: z.array(z.string()).default([]),
});

export const RatingsSchema = z.object({
  average_rating: z.number().min(0).max(5).default(0),
  total_ratings: z.number().int().nonnegative().default(0),
  review_count: z.number().int().nonnegative().default(0),
  quality_score: z.number().min(0).max(100).default(0),
  trust_score: z.number().min(0).max(100).default(0),
});

export const AnalyticsSchema = z.object({
  downloads: z.number().int().nonnegative().default(0),
  installs: z.number().int().nonnegative().default(0),
  executions: z.number().int().nonnegative().default(0),
  active_users: z.number().int().nonnegative().default(0),
});

export const BenchmarkSchema = z.object({
  latency_ms: z.number().nonnegative().optional(),
  accuracy_rate: z.number().min(0).max(1).optional(),
  token_efficiency: z.number().min(0).max(1).optional(),
  hallucination_rate: z.number().min(0).max(1).optional(),
  execution_success_rate: z.number().min(0).max(1).optional(),
}).optional();

export const SkillSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2),
  slug: z.string().regex(/^[a-z0-9-]+$/, { message: "Slug must be lowercase alphanumeric and hyphens only (e.g. react-perf-optimizer)" }),
  description: z.string().min(10),
  content: z.string().min(1), // The actual system prompt or skill code
  author: z.string().min(1),
  organization: z.string().optional(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, { message: "Version must be a valid semantic version (e.g. 1.0.0)" }), // Strict semantic versioning (x.y.z)
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  license: z.string().default('MIT'),
  repository_url: z.string().url().optional(),
  homepage_url: z.string().url().optional(),
  documentation_url: z.string().url().optional(),
  category: z.string(),
  tags: z.array(z.string()),
  difficulty_level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
  maturity_level: z.enum(['alpha', 'beta', 'stable', 'deprecated']).default('stable'),
  compatibility: CompatibilitySchema,
  dependencies: DependencySchema.default({}),
  examples: ExampleLibrarySchema,
  benchmarks: BenchmarkSchema,
  ratings: RatingsSchema.default({}),
  analytics: AnalyticsSchema.default({}),
});

export type Skill = z.infer<typeof SkillSchema>;
export type Compatibility = z.infer<typeof CompatibilitySchema>;
export type ExampleUseCase = z.infer<typeof ExampleUseCaseSchema>;
export type ExampleLibrary = z.infer<typeof ExampleLibrarySchema>;
export type Ratings = z.infer<typeof RatingsSchema>;
export type Analytics = z.infer<typeof AnalyticsSchema>;
export type Benchmark = z.infer<typeof BenchmarkSchema>;
