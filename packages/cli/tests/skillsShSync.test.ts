import { test, describe, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { syncSkillsSh, fetchAllSkills, safePathParts } from '../src/sync/skillsShSync';

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'status',
    headers: { get: (name: string) => headers[name] ?? null },
    json: async () => body,
  } as Response;
}

afterEach(() => {
  mock.restoreAll();
});

describe('skills.sh Safe Path Parser', () => {
  test('neutralizes path traversal attempts', () => {
    const parts = safePathParts('../../../etc/passwd');
    assert.deepEqual(parts, ['etc', 'passwd']);
  });
});

describe('fetchAllSkills', () => {
  test('follows pagination until hasMore is false', async () => {
    const calls: string[] = [];
    mock.method(globalThis, 'fetch', async (url: string) => {
      calls.push(url);
      if (calls.length === 1) {
        return jsonResponse({
          data: [{ id: 'a/b/c', slug: 'c', name: 'C', source: 'a/b', installs: 1, sourceType: 'github', installUrl: null, url: 'https://x' }],
          pagination: { page: 0, perPage: 500, total: 2, hasMore: true },
        });
      }
      return jsonResponse({
        data: [{ id: 'd/e/f', slug: 'f', name: 'F', source: 'd/e', installs: 1, sourceType: 'github', installUrl: null, url: 'https://y' }],
        pagination: { page: 1, perPage: 500, total: 2, hasMore: false },
      });
    });

    const skills = await fetchAllSkills({ requestDelayMs: 0 });
    assert.equal(skills.length, 2);
    assert.equal(calls.length, 2);
    assert.match(calls[0], /page=0/);
    assert.match(calls[1], /page=1/);
  });
});

describe('syncSkillsSh', () => {
  test('writes files to disk and skips already-downloaded skills on re-run', async () => {
    const outDir = await mkdtemp(path.join(tmpdir(), 'skillssh-'));
    try {
      let detailCalls = 0;
      mock.method(globalThis, 'fetch', async (url: string) => {
        if (url.includes('/skills?')) {
          return jsonResponse({
            data: [{ id: 'vercel-labs/skills/find-skills', slug: 'find-skills', name: 'Find Skills', source: 'vercel-labs/skills', installs: 10, sourceType: 'github', installUrl: null, url: 'https://x' }],
            pagination: { page: 0, perPage: 500, total: 1, hasMore: false },
          });
        }
        detailCalls++;
        return jsonResponse({
          id: 'vercel-labs/skills/find-skills',
          source: 'vercel-labs/skills',
          slug: 'find-skills',
          installs: 10,
          hash: 'abc123',
          files: [{ path: 'SKILL.md', contents: '# hello from skills.sh' }],
        });
      });

      const result1 = await syncSkillsSh({ outDir, requestDelayMs: 0, concurrency: 2 });
      assert.equal(result1.saved, 1);
      assert.equal(detailCalls, 1);

      const result2 = await syncSkillsSh({ outDir, requestDelayMs: 0, concurrency: 2 });
      assert.equal(result2.skipped, 1);
      assert.equal(detailCalls, 1, 'second run must not re-fetch an already-saved skill');

      const skillMd = await readFile(
        path.join(outDir, 'vercel-labs', 'skills', 'find-skills', 'SKILL.md'),
        'utf-8',
      );
      assert.equal(skillMd, '# hello from skills.sh');
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });
});
