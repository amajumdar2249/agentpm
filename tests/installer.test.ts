import fs from 'fs';
import path from 'path';
import { SkillInstaller } from '../src/installer';

describe('SkillInstaller', () => {
  const originalCwd = process.cwd();
  const testDir = path.join(__dirname, 'test-workspace');

  beforeAll(() => {
    // Scaffold test workspace
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    process.chdir(testDir);
  });

  afterAll(() => {
    // Restore CWD and clean up
    process.chdir(originalCwd);
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should create .agents/skills directory structure', () => {
    SkillInstaller.ensureDirExists();
    const skillsDir = path.join(testDir, '.agents', 'skills');
    expect(fs.existsSync(skillsDir)).toBe(true);
  });

  it('should successfully save skill locally and update agentpm.json config', () => {
    // Create mock agentpm.json
    const configPath = path.join(testDir, 'agentpm.json');
    fs.writeFileSync(configPath, JSON.stringify({ name: "test", version: "1.0.0", skills: {} }), 'utf8');

    const testContent = "# My Cool Skill\nRule: write neat code.";
    const targetPath = SkillInstaller.saveSkillLocal('cool-skill', testContent);

    // Verify file written
    expect(fs.existsSync(targetPath)).toBe(true);
    expect(fs.readFileSync(targetPath, 'utf8')).toBe(testContent);

    // Verify config file updated
    const configRaw = fs.readFileSync(configPath, 'utf8');
    const configObj = JSON.parse(configRaw);
    expect(configObj.skills['cool-skill']).toBe("1.0.0");
  });
});
