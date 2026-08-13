/**
 * skillsShSync.ts
 * ----------------
 * Full Data Ingestion & Registry Seeding Pipeline for AgentPM.
 * Imports AI skills from:
 *   1. Remote skills.sh API (with OIDC auth and 429 retry backoff)
 *   2. Local pre-extracted skill repository (542+ authors, 19.8k+ skills)
 *
 * Automatically runs Zero-Trust Security Audit before writing to registry.
 */

import * as fs from 'fs';
import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { scanContent } from '../scanner';
import { Severity } from '../types';

export interface SkillListItem {
  id: string;
  slug: string;
  name: string;
  source: string;
  installs: number;
  sourceType: 'github' | 'well-known';
  installUrl: string | null;
  url: string;
  isDuplicate?: boolean;
}

interface PaginatedSkillsResponse {
  data: SkillListItem[];
  pagination: { page: number; perPage: number; total: number; hasMore: boolean };
}

interface SkillFile {
  path: string;
  contents: string;
}

export interface SkillDetail {
  id: string;
  source: string;
  slug: string;
  installs: number;
  hash: string | null;
  files: SkillFile[] | null;
}

export interface SyncOptions {
  /** Where to write the cloned data. Default: "./registry/packages" */
  outDir?: string;
  /** Parallel detail-fetch workers. Default: 5 */
  concurrency?: number;
  /** Delay (ms) each worker waits between its own requests. Default: 400 */
  requestDelayMs?: number;
  /** Optional Vercel OIDC token for the higher, authenticated rate limit. */
  oidcToken?: string;
  /** Maximum skills to sync (optional limit). */
  limit?: number;
  /** Local folder containing pre-extracted skills for fast offline ingestion. */
  localDir?: string;
  /** Called after each skill finishes, for progress reporting. */
  onProgress?: (done: number, total: number, result: 'saved' | 'skipped' | 'quarantined' | 'failed') => void;
}

export interface SyncResult {
  total: number;
  saved: number;
  skipped: number;
  quarantined: number;
  failed: { id: string; error: string }[];
}

const BASE_URL = 'https://skills.sh/api/v1';
const PER_PAGE = 500;
const MAX_RETRIES = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function safePathParts(raw: string): string[] {
  return raw
    .replace(/\\/g, '/')
    .split('/')
    .map((p) => p.trim())
    .filter((p) => p !== '' && p !== '.' && p !== '..')
    .map((p) => p.replace(/[^A-Za-z0-9._-]/g, '_'));
}

async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Low-level fetch helper: retries, backoff, 429 handling
 */
export async function safeGet<T>(url: string, oidcToken?: string): Promise<T> {
  const headers: Record<string, string> = { 'User-Agent': 'agentpm-skills-sh-sync/1.0' };
  if (oidcToken) headers.Authorization = `Bearer ${oidcToken}`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, { headers });
    } catch (err) {
      if (attempt === MAX_RETRIES) throw err;
      await sleep(1000 * attempt);
      continue;
    }

    if (res.ok) return (await res.json()) as T;

    if (res.status === 429) {
      const retryAfterHeader = res.headers.get('Retry-After');
      const parsed = retryAfterHeader !== null ? Number(retryAfterHeader) : NaN;
      const retryAfter = Number.isFinite(parsed) ? parsed : 3;
      await sleep(retryAfter * 1000);
      continue;
    }

    if ([500, 502, 503, 504].includes(res.status)) {
      if (attempt === MAX_RETRIES) throw new Error(`${res.status} ${res.statusText}`);
      await sleep(1000 * attempt);
      continue;
    }

    // 400, 401, 403, 404 - Immediate throw, do not retry
    throw new Error(`${res.status} ${res.statusText} for ${url}`);
  }

  throw new Error(`gave up after ${MAX_RETRIES} attempts: ${url}`);
}

/**
 * Ingests skills from a local pre-extracted directory tree with fast short-circuiting.
 */
export async function ingestFromLocalDirectory(localDir: string, outDir: string, opts: SyncOptions): Promise<SyncResult> {
  await mkdir(outDir, { recursive: true });

  const skillFiles: string[] = [];
  function walk(current: string) {
    if (!fs.existsSync(current)) return;
    if (opts.limit && skillFiles.length >= opts.limit) return;

    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      if (opts.limit && skillFiles.length >= opts.limit) return;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.json'))) {
        skillFiles.push(full);
      }
    }
  }

  walk(localDir);

  let targetList = skillFiles;
  if (opts.limit && targetList.length > opts.limit) {
    targetList = targetList.slice(0, opts.limit);
  }

  let saved = 0;
  let skipped = 0;
  let quarantined = 0;
  let done = 0;
  const failed: { id: string; error: string }[] = [];

  for (const filePath of targetList) {
    done++;
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const relPath = path.relative(localDir, filePath);
      const safeRel = path.join(outDir, ...safePathParts(relPath));

      if (fs.existsSync(safeRel)) {
        skipped++;
        opts.onProgress?.(done, targetList.length, 'skipped');
        continue;
      }

      // Security Audit
      const findings = scanContent(content, relPath);
      const isDangerous = findings.some(f => f.severity === Severity.CRITICAL);

      if (isDangerous) {
        quarantined++;
        opts.onProgress?.(done, targetList.length, 'quarantined');
        continue;
      }

      fs.mkdirSync(path.dirname(safeRel), { recursive: true });
      fs.writeFileSync(safeRel, content, 'utf-8');
      saved++;
      opts.onProgress?.(done, targetList.length, 'saved');
    } catch (err: any) {
      failed.push({ id: filePath, error: err.message });
      opts.onProgress?.(done, targetList.length, 'failed');
    }
  }

  return { total: targetList.length, saved, skipped, quarantined, failed };
}

/**
 * Public Entry Point for Synchronization
 */
export async function syncSkillsSh(opts: SyncOptions = {}): Promise<SyncResult> {
  const outDir = opts.outDir ?? './registry/packages';

  // Check if explicit local directory requested
  if (opts.localDir && fs.existsSync(opts.localDir)) {
    return ingestFromLocalDirectory(opts.localDir, outDir, opts);
  }

  // Check known local repository path
  const localCandidate = path.resolve(__dirname, '..', '..', '..', 'skills_sh_extracted', 'all_skills');
  const altCandidate = path.resolve('C:/Users/amaju/OneDrive/Documents/GitHub Repo\'s/skills_sh_extracted/all_skills');
  const defaultLocal = fs.existsSync(localCandidate) ? localCandidate : (fs.existsSync(altCandidate) ? altCandidate : null);

  // If remote OIDC token is NOT set and local dataset exists, use local ingestion
  if (!opts.oidcToken && defaultLocal) {
    return ingestFromLocalDirectory(defaultLocal, outDir, opts);
  }

  // Remote Fetch Flow
  await mkdir(outDir, { recursive: true });
  const indexFile = path.join(outDir, '_index.json');

  let allSkills: SkillListItem[] = [];
  if (await exists(indexFile)) {
    allSkills = JSON.parse(await readFile(indexFile, 'utf-8')) as SkillListItem[];
  } else {
    try {
      const data = await safeGet<PaginatedSkillsResponse>(`${BASE_URL}/skills?page=0&per_page=500`, opts.oidcToken);
      allSkills = data.data;
      await writeFile(indexFile, JSON.stringify(allSkills, null, 2), 'utf-8');
    } catch (err) {
      if (defaultLocal) {
        return ingestFromLocalDirectory(defaultLocal, outDir, opts);
      }
      throw err;
    }
  }

  if (opts.limit && allSkills.length > opts.limit) {
    allSkills = allSkills.slice(0, opts.limit);
  }

  let saved = 0;
  let skipped = 0;
  let quarantined = 0;
  let done = 0;
  const failed: { id: string; error: string }[] = [];

  for (const skill of allSkills) {
    done++;
    try {
      const folder = path.join(outDir, ...safePathParts(skill.id));
      const marker = path.join(folder, '_meta.json');

      if (await exists(marker)) {
        skipped++;
        opts.onProgress?.(done, allSkills.length, 'skipped');
        continue;
      }

      const detail = await safeGet<SkillDetail>(`${BASE_URL}/skills/${skill.id}`, opts.oidcToken);
      await mkdir(folder, { recursive: true });
      const { files, ...meta } = detail;
      await writeFile(marker, JSON.stringify(meta, null, 2), 'utf-8');

      for (const file of files ?? []) {
        const relParts = safePathParts(file.path);
        if (relParts.length === 0) continue;
        const filePath = path.join(folder, ...relParts);
        
        // Security audit
        const findings = scanContent(file.contents ?? '', file.path);
        if (findings.some(f => f.severity === Severity.CRITICAL)) {
          quarantined++;
          continue;
        }

        await mkdir(path.dirname(filePath), { recursive: true });
        await writeFile(filePath, file.contents ?? '', 'utf-8');
      }

      saved++;
      opts.onProgress?.(done, allSkills.length, 'saved');
      await sleep(opts.requestDelayMs ?? 400);
    } catch (err: any) {
      failed.push({ id: skill.id, error: err.message });
      opts.onProgress?.(done, allSkills.length, 'failed');
    }
  }

  return { total: allSkills.length, saved, skipped, quarantined, failed };
}
