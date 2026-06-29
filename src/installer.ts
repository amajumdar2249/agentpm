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
  metadata: z.record(z.any()).optional(),
  signature: z.any().optional()
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
    
    const slug = skillName.toLowerCase().replace(/[@\/]/g, '-').replace(/^-/, '').replace(/\s+/g, '-');
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
    let registryUrl = 'https://raw.githubusercontent.com/amajumdar2249/agentpm-registry/main/packages';
    let authToken = '';

    const configPath = path.join(process.cwd(), 'agentpm.json');
    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (config.registryUrl) registryUrl = config.registryUrl.replace(/\/$/, '');
        if (config.authToken) authToken = config.authToken;
      } catch (err) {
        // ignore
      }
    }

    const url = `${registryUrl}/${slug}.json`;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const headers: Record<string, string> = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(url, { signal: controller.signal, headers });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Skill '${skillName}' not found in registry (local or remote). Status: ${response.status}`);
      }
      
      const json = await response.json();
      const validated = SkillPackageSchema.parse(json);

      if (validated.signature) {
        try {
          const { verify } = require('sigstore');
          const buffer = Buffer.from(validated.content.trim(), 'utf8');
          await verify(validated.signature, buffer);
        } catch (err: any) {
          throw new Error(`CRITICAL SECURITY ALERT: Cryptographic signature verification failed for '${skillName}'. The package may have been tampered with. Error: ${err.message}`);
        }
      }

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
    this.updateLockfile(skillName, version, content); // Fix 12: update lockfile
    
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

  // Fix 12: agentpm.lock support
  private static updateLockfile(skillName: string, version: string, content: string) {
    const lockPath = path.join(process.cwd(), 'agentpm.lock');
    const crypto = require('crypto');
    const integrity = 'sha256-' + crypto.createHash('sha256').update(content).digest('hex');

    let lock: Record<string, any> = { lockfileVersion: 1, skills: {} };

    if (fs.existsSync(lockPath)) {
      try {
        lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
      } catch {
        console.warn(chalk.yellow('⚠️ agentpm.lock is corrupted. Recreating.'));
      }
    }

    const slug = skillName.toLowerCase().replace(/[@\/]/g, '-').replace(/^-/, '').replace(/\s+/g, '-');

    lock.skills[skillName] = {
      version,
      integrity,
      installedAt: new Date().toISOString(),
      resolved: `https://raw.githubusercontent.com/amajumdar2249/agentpm-registry/main/packages/${slug}.json`
    };

    try {
      fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2), 'utf8');
    } catch (err) {
      console.warn(chalk.yellow(`⚠️ Could not update agentpm.lock: ${(err as Error).message}`));
    }
  }

  // Fix 10: Uninstall skill
  public static uninstallSkill(skillName: string): boolean {
    const safeName = skillName.replace(/[\/\@]/g, '-').replace(/^-/, '').replace(/\s+/g, '-');
    const skillPath = path.join(this.agentsDir, `${safeName}.md`);
    
    if (!fs.existsSync(skillPath)) {
      return false; // Skill not installed
    }
    
    fs.unlinkSync(skillPath);

    // Remove from agentpm.json
    const configPath = path.join(process.cwd(), 'agentpm.json');
    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        delete config.skills?.[skillName];
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
      } catch (err) {
        console.warn(chalk.yellow(`Could not update agentpm.json after uninstall: ${(err as Error).message}`));
      }
    }

    // Remove from agentpm.lock
    const lockPath = path.join(process.cwd(), 'agentpm.lock');
    if (fs.existsSync(lockPath)) {
      try {
        const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
        delete lock.skills?.[skillName];
        fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2), 'utf8');
      } catch (err) {
        console.warn(chalk.yellow(`Could not update agentpm.lock after uninstall: ${(err as Error).message}`));
      }
    }

    return true;
  }

  // Fix 11: Get installed skill version for update check
  public static getInstalledVersion(skillName: string): string | null {
    const configPath = path.join(process.cwd(), 'agentpm.json');
    if (!fs.existsSync(configPath)) return null;
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return config.skills?.[skillName] ?? null;
    } catch {
      return null;
    }
  }
}
