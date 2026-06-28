import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import chalk from 'chalk';

const SkillPackageSchema = z.object({
  name: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  content: z.string(),
  version: z.string().default("1.0.0"),
  metadata: z.record(z.any()).optional()
});

const SkillNameSchema = z.string().min(1).max(100).regex(/^[a-zA-Z0-9\-\_\@\/]+$/, "Invalid characters in skill name");

export class SkillInstaller {
  private static get agentsDir() {
    return path.join(process.cwd(), '.agents', 'skills');
  }
  private static localRegistryDir = path.join(__dirname, '..', 'registry', 'packages');

  public static ensureDirExists() {
    if (!fs.existsSync(this.agentsDir)) {
      fs.mkdirSync(this.agentsDir, { recursive: true });
    }
  }

  /**
   * Fetches a skill content. Checks local compiled registry first,
   * then falls back to fetching from a remote repository.
   */
  public static async fetchRemoteSkill(skillName: string): Promise<{content: string, version: string}> {
    try {
      SkillNameSchema.parse(skillName);
    } catch {
      throw new Error(`Invalid skill name format: ${skillName}`);
    }
    
    const slug = encodeURIComponent(skillName.toLowerCase().replace(/[@\/]/g, '-').replace(/^-/, '').replace(/\s+/g, '-'));
    const localPkgPath = path.join(this.localRegistryDir, `${slug}.json`);

    // 1. Try Local Registry Seeded Dataset
    if (fs.existsSync(localPkgPath)) {
      try {
        const raw = fs.readFileSync(localPkgPath, 'utf8');
        const parsed = JSON.parse(raw);
        const validated = SkillPackageSchema.parse(parsed);
        return { content: validated.content, version: validated.version };
      } catch (err) {
        throw new Error(`Failed to read local package ${slug}: ${(err as Error).message}`);
      }
    }

    // 2. Remote Registry Fallback (GitHub Raw or custom endpoint)
    // For demonstration, fallback to awesome-chatgpt-prompts or a raw github content.
    const url = `https://raw.githubusercontent.com/amajumdar2249/agentpm-registry/main/packages/${slug}.json`;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Skill '${skillName}' not found in registry (local or remote).`);
      }
      
      const json = await response.json();
      const validated = SkillPackageSchema.parse(json);
      return { content: validated.content, version: validated.version };
    } catch (error) {
      clearTimeout(timeout);
      if ((error as Error).name === 'AbortError') {
        throw new Error(`Registry connection timed out for '${skillName}'.`);
      }
      throw new Error(`Registry connection failed: ${(error as Error).message}`);
    }
  }

  public static saveSkillLocal(skillName: string, content: string, version: string = "1.0.0") {
    this.ensureDirExists();
    const safeName = skillName.replace(/[\/\@]/g, '-').replace(/^-/, '').replace(/\s+/g, '-');
    const targetPath = path.join(this.agentsDir, `${safeName}.md`);
    fs.writeFileSync(targetPath, content, 'utf8');
    
    // Also update agentpm.json config dependencies
    this.updateWorkspaceConfig(skillName, version);
    
    return targetPath;
  }

  private static updateWorkspaceConfig(skillName: string, version: string) {
    const configPath = path.join(process.cwd(), 'agentpm.json');
    if (fs.existsSync(configPath)) {
      try {
        const raw = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(raw);
        if (!config.skills) {
          config.skills = {};
        }
        config.skills[skillName] = version;
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
      } catch (err) {
        console.warn(chalk.yellow(`Warning: Failed to update agentpm.json config - ${(err as Error).message}`));
      }
    }
  }
}
