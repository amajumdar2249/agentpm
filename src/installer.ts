import fs from 'fs';
import path from 'path';
import { z } from 'zod';

const SkillManifestSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  content: z.string()
});

export class SkillInstaller {
  private static agentsDir = path.join(process.cwd(), '.agents', 'skills');

  public static ensureDirExists() {
    if (!fs.existsSync(this.agentsDir)) {
      fs.mkdirSync(this.agentsDir, { recursive: true });
    }
  }

  public static async fetchRemoteSkill(skillName: string): Promise<string> {
    // For demonstration, fetch a mock system prompt from a public raw github endpoint.
    // In production, this would query a real registry index first.
    const url = 'https://raw.githubusercontent.com/f/awesome-chatgpt-prompts/main/prompts.csv';
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch skill: ${response.statusText}`);
      }
      
      let text = await response.text();
      // Enforce file size limit check using zod string validation length
      z.string().max(500000).parse(text); 
      
      // Simulate taking the raw markdown
      return text.substring(0, 1000); // Returning sample valid text based on the fetch
    } catch (error) {
      throw new Error(`Registry connection failed: ${(error as Error).message}`);
    }
  }

  public static saveSkillLocal(skillName: string, content: string) {
    this.ensureDirExists();
    const safeName = skillName.replace(/[\/\@]/g, '-').replace(/^-/, '');
    const targetPath = path.join(this.agentsDir, `${safeName}.md`);
    fs.writeFileSync(targetPath, content, 'utf8');
    return targetPath;
  }
}
