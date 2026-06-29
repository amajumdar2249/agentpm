import fs from 'fs';
import path from 'path';
import { handleRun } from '../src/commands/run';
import { CommandContext } from '../src/core/factory';

jest.mock('sigstore', () => ({
  sign: jest.fn().mockResolvedValue({ bundle: 'mock-signature-bundle' }),
  verify: jest.fn().mockResolvedValue(true)
}));

jest.mock('vm2', () => ({
  VM: class {
    sandbox: any;
    constructor(opts: any) {
      this.sandbox = opts.sandbox;
    }
    run(code: string) {
      if (this.sandbox && this.sandbox.console && this.sandbox.console.log) {
        this.sandbox.console.log('hello from vm2');
      }
    }
  }
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

  it('should execute javascript code block securely inside vm2 sandbox', async () => {
    const skillName = 'js-script';
    const skillContent = `---
name: js-script
description: JS execution
---
\`\`\`javascript
console.log("hello from vm2");
\`\`\`
`;

    const skillPath = path.join(testDir, '.agents', 'skills', `${skillName}.md`);
    fs.writeFileSync(skillPath, skillContent, 'utf8');

    await handleRun(mockContext, skillName);
    expect(loggedMessages.some(m => m.includes('[Sandbox]') && m.includes('hello from vm2'))).toBe(true);
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
