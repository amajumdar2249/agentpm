import fs from 'fs';
import path from 'path';
import { handlePublish } from '../src/commands/publish';
import { CommandContext } from '../src/core/factory';

jest.mock('sigstore', () => ({
  sign: jest.fn().mockResolvedValue({ bundle: 'mock-signature-bundle' }),
  verify: jest.fn().mockResolvedValue(true)
}));

describe('Publish Command', () => {
  const originalCwd = process.cwd();
  const testDir = path.join(__dirname, 'test-publish-workspace');

  let mockContext: CommandContext;
  let loggedMessages: string[] = [];
  let errorMessages: string[] = [];
  let exitCode: number | undefined;

  beforeEach(() => {
    loggedMessages = [];
    errorMessages = [];
    exitCode = undefined;

    // Set up test workspace structure
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    // Create local registry mockup inside workspace
    const registryDir = path.join(testDir, 'registry');
    const packagesDir = path.join(registryDir, 'packages');
    fs.mkdirSync(packagesDir, { recursive: true });
    fs.writeFileSync(path.join(registryDir, 'index.json'), '[]', 'utf8');

    mockContext = {
      io: {
        log: (msg) => loggedMessages.push(msg || ''),
        error: (msg) => errorMessages.push(msg || ''),
        write: (msg) => loggedMessages.push(msg),
      },
      fs: {
        promises: fs.promises,
        existsSync: fs.existsSync,
        readFileSync: fs.readFileSync,
        writeFileSync: fs.writeFileSync,
        statSync: fs.statSync,
      },
      process: {
        cwd: () => testDir,
        exit: (code) => {
          exitCode = code;
          throw new Error(`Process exited with code ${code}`);
        },
      },
      exec: jest.fn() as any,
    };
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should fail if SKILL.md is missing in target directory', async () => {
    await expect(handlePublish(mockContext)).rejects.toThrow('Process exited with code 1');
    expect(exitCode).toBe(1);
    expect(errorMessages[0]).toContain('SKILL.md file not found');
  });

  it('should successfully parse, validate, index, and save a valid SKILL.md', async () => {
    const validSkillMd = `---
name: mock-test-skill
description: "A valid testing skill configuration playbooks."
author: tester
version: 1.0.0
license: MIT
category: testing
tags: test, helper
difficulty_level: beginner
maturity_level: stable
---

# Mock Test Skill
This is the core content instructions block.
`;

    fs.writeFileSync(path.join(testDir, 'SKILL.md'), validSkillMd, 'utf8');

    // Run publish command
    // Overriding the registry resolver inside the test environment by creating registry relative to __dirname
    const relativeRegistryPath = path.resolve(__dirname, '..', 'registry');
    const hasLocalRegistry = fs.existsSync(relativeRegistryPath);
    
    // Temporarily point __dirname logic or mock fs to intercept path resolution
    const originalExistsSync = mockContext.fs.existsSync;
    mockContext.fs.existsSync = (p: any) => {
      const pStr = p as string;
      if (pStr.includes('registry')) {
        return true; // pretend it exists in the test context
      }
      return originalExistsSync(p);
    };

    const writtenFiles: Record<string, string> = {};
    mockContext.fs.writeFileSync = (p: any, data: any, options?: any) => {
      const pStr = p as string;
      writtenFiles[pStr] = data;
      if (pStr.includes('registry')) {
        return; // intercept registry writes in tests to keep disk clean
      }
      return fs.writeFileSync(p, data, options);
    };

    mockContext.fs.readFileSync = (p: any, options?: any): any => {
      const pStr = p as string;
      if (pStr.includes('registry') && pStr.includes('index.json')) {
        return '[]';
      }
      return fs.readFileSync(p, options);
    };

    await handlePublish(mockContext);

    // Verify JSON file written with generated UUID and correct slug
    const packageFiles = Object.keys(writtenFiles).filter(f => f.includes('packages'));
    expect(packageFiles.length).toBe(1);
    const parsedPkg = JSON.parse(writtenFiles[packageFiles[0]]);
    expect(parsedPkg.name).toBe('mock-test-skill');
    expect(parsedPkg.slug).toBe('mock-test-skill');
    expect(parsedPkg.author).toBe('tester');
    expect(parsedPkg.tags).toEqual(['test', 'helper']);

    // Verify index file updated
    const indexFiles = Object.keys(writtenFiles).filter(f => f.includes('index.json'));
    expect(indexFiles.length).toBe(1);
    const parsedIndex = JSON.parse(writtenFiles[indexFiles[0]]);
    expect(parsedIndex.length).toBe(1);
    expect(parsedIndex[0].slug).toBe('mock-test-skill');
  });

  it('should fail validation if version format is invalid', async () => {
    const invalidSkillMd = `---
name: bad-version-skill
description: "A test with bad semver values."
author: tester
version: 1.0 # invalid semver
---

# Bad Skill
Content.
`;

    fs.writeFileSync(path.join(testDir, 'SKILL.md'), invalidSkillMd, 'utf8');

    // Overriding the registry resolver inside the test environment by creating registry relative to __dirname
    const originalExistsSync = mockContext.fs.existsSync;
    mockContext.fs.existsSync = (p: any) => {
      const pStr = p as string;
      if (pStr.includes('registry')) {
        return true; // pretend it exists in the test context
      }
      return originalExistsSync(p);
    };

    mockContext.fs.readFileSync = (p: any, options?: any): any => {
      const pStr = p as string;
      if (pStr.includes('registry') && pStr.includes('index.json')) {
        return '[]';
      }
      return fs.readFileSync(p, options);
    };

    await expect(handlePublish(mockContext)).rejects.toThrow('Process exited with code 1');
    expect(exitCode).toBe(1);
  });
});
