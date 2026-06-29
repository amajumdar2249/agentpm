import fs from 'fs';
import path from 'path';
import { handleRun } from '../src/commands/run';
import { CommandContext } from '../src/core/factory';

jest.mock('sigstore', () => ({
  sign: jest.fn().mockResolvedValue({ bundle: 'mock-signature-bundle' }),
  verify: jest.fn().mockResolvedValue(true)
}));

jest.mock('@e2b/code-interpreter', () => ({
  Sandbox: {
    create: jest.fn().mockResolvedValue({
      commands: {
        run: jest.fn().mockImplementation(async (cmd, opts) => {
          if (opts && opts.onStdout) {
            opts.onStdout({ line: 'hello from e2b' });
          }
          return { exitCode: 0 };
        })
      },
      close: jest.fn().mockResolvedValue(undefined)
    })
  }
}));

describe('Run Command', () => {
  const originalCwd = process.cwd();
  const testDir = path.join(__dirname, 'test-run-workspace');

  let mockContext: CommandContext;
  let loggedMessages: string[] = [];
  let errorMessages: string[] = [];
  let exitCode: number | undefined;

  beforeAll(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(testDir)) {
      try {
        fs.rmSync(testDir, { recursive: true, force: true });
      } catch (e) {
        // Ignore cleanup errors on Windows
      }
    }
  });

  beforeEach(() => {
    loggedMessages = [];
    errorMessages = [];
    exitCode = undefined;

    const skillsDir = path.join(testDir, '.agents', 'skills');
    fs.mkdirSync(skillsDir, { recursive: true });

    mockContext = {
      io: {
        log: (...args: any[]) => loggedMessages.push(args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')),
        error: (...args: any[]) => errorMessages.push(args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')),
        write: (msg: any) => loggedMessages.push(String(msg || '')),
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

  it('should display pure instructions if no code blocks exist', async () => {
    const skillName = 'pure-instructions';
    const skillContent = `---
name: pure-instructions
description: Pure prompt
---
# Just Instructions
Follow these rules carefully.`;

    const skillPath = path.join(testDir, '.agents', 'skills', `${skillName}.md`);
    fs.writeFileSync(skillPath, skillContent, 'utf8');

    await handleRun(mockContext, skillName);
    expect(loggedMessages.some(m => m.includes('--- Playbook Instructions ---'))).toBe(true);
    expect(loggedMessages.some(m => m.includes('Follow these rules carefully.'))).toBe(true);
  });

  it('should execute javascript code block securely inside native vm sandbox', async () => {
    const skillName = 'js-script';
    const skillContent = `---
name: js-script
description: JS execution
---
\`\`\`javascript
console.log("hello from sandbox");
\`\`\`
`;

    const skillPath = path.join(testDir, '.agents', 'skills', `${skillName}.md`);
    fs.writeFileSync(skillPath, skillContent, 'utf8');

    await handleRun(mockContext, skillName);
    expect(loggedMessages.some(m => m.includes('[Sandbox]') && m.includes('hello from sandbox'))).toBe(true);
  });

  it('should execute bash code block using E2B code interpreter when API key is present', async () => {
    process.env.E2B_API_KEY = 'test_api_key';
    const skillName = 'bash-script';
    const skillContent = `---
name: bash-script
description: Bash execution
---
\`\`\`bash
echo "test"
\`\`\`
`;

    const skillPath = path.join(testDir, '.agents', 'skills', `${skillName}.md`);
    fs.writeFileSync(skillPath, skillContent, 'utf8');

    await handleRun(mockContext, skillName);
    expect(loggedMessages.some(m => m.includes('[E2B]') && m.includes('hello from e2b'))).toBe(true);
    delete process.env.E2B_API_KEY;
  });
});
