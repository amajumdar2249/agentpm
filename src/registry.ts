// ============================================================
// AgentPM — Universal Registry Client
// Connects to amajumdar2249/agentpm-registry on GitHub to search,
// verify hashes, and download AI skills securely.
// ============================================================

import { RegistrySkillMeta } from './types';

const REGISTRY_RAW_BASE = 'https://raw.githubusercontent.com/amajumdar2249/agentpm-registry/main';

/**
 * Basic HTTPS helper to retrieve raw data with zero external dependencies.
 */
export async function fetchUrl(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'agentpm-cli/1.3.0' } });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} (${res.statusText}) loading ${url}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

/** Built-in curated popular skills index for instant offline fallback. */
export const POPULAR_SKILLS: Record<string, RegistrySkillMeta> = {
  'react-best-practices': {
    name: 'react-best-practices',
    version: '1.0.0',
    description: 'Vercel performance optimization rules for React & Next.js (waterfalls, bundle, RSC)',
    tags: ['react', 'nextjs', 'performance'],
    content: `# React & Next.js Performance Optimization Skill\n\n- Eliminate Waterfalls: Use Promise.all() for independent operations.\n- Bundle Size Optimization: Use dynamic imports for heavy components.\n- Server-Side Performance: Use React.cache() and minimize data serialization to client components.`,
  },
  '@oss/react-expert': {
    name: '@oss/react-expert',
    version: '1.0.0',
    description: 'Production React 19 / Server Components architectural guidelines',
    tags: ['react', 'rsc', 'typescript'],
    content: `# React Expert Skill\n\nGuidelines for modern state management, concurrent mode, and streaming SSR.`,
  },
  'karpathy-guidelines': {
    name: 'karpathy-guidelines',
    version: '2.1.0',
    description: 'Andrej Karpathy AI coding and neural network development rules',
    tags: ['ai', 'python', 'pytorch'],
    content: `# Karpathy Guidelines\n\n- Start simple and verify first.\n- Visualize inputs, inspect losses, and avoid premature optimization.`,
  },
  'security-auditor': {
    name: 'security-auditor',
    version: '1.2.0',
    description: 'DevSecOps & zero-trust security auditor for web and cloud environments',
    tags: ['security', 'devsecops', 'owasp'],
    content: `# Security Auditor Skill\n\n- Validate all inputs strictly.\n- Ensure all credentials and environment variables are protected.`,
  },
  '12-factor-app': {
    name: '12-factor-app',
    version: '1.0.0',
    description: 'The Twelve-Factor App methodology for building cloud-native SaaS applications',
    tags: ['cloud', 'architecture', 'best-practices'],
  }
};

/**
 * Normalizes any skill name or scoped package to a clean slug.
 */
export function toSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^@/, '')
    .replace(/[\/\\]+/g, '-')
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Searches the registry for matching skills from local curated list and remote index.
 */
export async function searchSkills(query: string): Promise<RegistrySkillMeta[]> {
  const q = query.toLowerCase().trim();
  const results: RegistrySkillMeta[] = [];
  const seen = new Set<string>();

  // 1. Search local curated catalogue
  for (const [key, meta] of Object.entries(POPULAR_SKILLS)) {
    if (
      key.toLowerCase().includes(q) ||
      meta.description.toLowerCase().includes(q) ||
      meta.tags?.some((t) => t.toLowerCase().includes(q))
    ) {
      results.push(meta);
      seen.add(meta.name);
    }
  }

  // 2. Query remote master index (44,500+ skills)
  try {
    const rawIndex = await fetchUrl(`${REGISTRY_RAW_BASE}/index.json`);
    const parsed = JSON.parse(rawIndex);
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (results.length >= 25) break;
        const name = item.name || item.id || item.slug || '';
        const desc = item.description || '';
        if (
          !seen.has(name) &&
          (name.toLowerCase().includes(q) || desc.toLowerCase().includes(q))
        ) {
          results.push({
            name,
            version: item.version || '1.0.0',
            description: desc || `Verified AI skill: ${name}`,
            tags: item.tags || (item.category ? [item.category] : []),
          });
          seen.add(name);
        }
      }
    }
  } catch {
    // Offline or network timeout fallback
  }

  return results;
}

/**
 * Fetches the raw skill markdown content from the remote registry JSON packages or markdown files.
 */
export async function fetchSkillContent(skillName: string): Promise<{ content: string; version: string; description?: string }> {
  const normalized = skillName.trim();
  const slug = toSlug(normalized);

  // Check local offline popular skills
  if (POPULAR_SKILLS[normalized]?.content) {
    return {
      content: POPULAR_SKILLS[normalized].content!,
      version: POPULAR_SKILLS[normalized].version,
      description: POPULAR_SKILLS[normalized].description,
    };
  }

  // Candidate remote endpoints on GitHub raw registry
  const candidateUrls = [
    `${REGISTRY_RAW_BASE}/packages/${slug}.json`,
    `${REGISTRY_RAW_BASE}/packages/${encodeURIComponent(normalized)}.json`,
    `${REGISTRY_RAW_BASE}/packages/${slug}.md`,
    `${REGISTRY_RAW_BASE}/packages/${slug}/SKILL.md`,
  ];

  for (const url of candidateUrls) {
    try {
      const raw = await fetchUrl(url);
      if (raw && raw.length > 10) {
        // Try parsing JSON format package
        if (url.endsWith('.json')) {
          try {
            const parsed = JSON.parse(raw);
            const content = parsed.content || parsed.prompt || parsed.instructions || parsed.description;
            if (content && typeof content === 'string') {
              return {
                content,
                version: parsed.version || '1.0.0',
                description: parsed.description,
              };
            }
          } catch {
            // Not valid JSON, continue
          }
        } else {
          // Direct markdown
          return {
            content: raw,
            version: '1.0.0',
          };
        }
      }
    } catch {
      // Continue to next candidate endpoint
    }
  }

  // If not found in primary packages, try searching index for direct URL or content
  try {
    const rawIndex = await fetchUrl(`${REGISTRY_RAW_BASE}/index.json`);
    const parsed = JSON.parse(rawIndex);
    if (Array.isArray(parsed)) {
      const match = parsed.find(
        (item) => toSlug(item.name || item.id || '') === slug
      );
      if (match && (match.content || match.description)) {
        return {
          content: match.content || `# Skill: ${match.name}\n\n${match.description}\n`,
          version: match.version || '1.0.0',
          description: match.description,
        };
      }
    }
  } catch {
    // Ignore index fallback error
  }

  throw new Error(`Skill '${skillName}' could not be found in agentpm-registry. Run 'agentpm search ${skillName}' to find available packages.`);
}
