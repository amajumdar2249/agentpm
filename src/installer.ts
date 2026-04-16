import fs from 'fs';
import path from 'path';

export class SkillInstaller {
  private static agentsDir = path.join(process.cwd(), '.agents', 'skills');

  /**
   * Initializes the directories if they don't exist
   */
  public static ensureDirExists() {
    if (!fs.existsSync(this.agentsDir)) {
      fs.mkdirSync(this.agentsDir, { recursive: true });
    }
  }

  /**
   * Mocks downloading a remote skill returning raw markdown content
   */
  public static async fetchRemoteSkill(skillName: string): Promise<string> {
    // In a production environment this would fetch from raw.githubusercontent or an API
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`
# The ${skillName} Skill
This is an officially installed skill via agentpm.
Always ensure you output clean structured code and follow standard practices.
        `.trim());
      }, 1200);
    });
  }

  /**
   * Saves the audited skill locally
   */
  public static saveSkillLocal(skillName: string, content: string) {
    this.ensureDirExists();
    // sanitize slashes or scopes for filenames (e.g. "@oss/react" -> "oss-react")
    const safeName = skillName.replace(/[\/\@]/g, '-').replace(/^-/, '');
    const targetPath = path.join(this.agentsDir, `${safeName}.md`);
    fs.writeFileSync(targetPath, content, 'utf8');
    return targetPath;
  }
}