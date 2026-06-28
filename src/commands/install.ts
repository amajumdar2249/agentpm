import chalk from 'chalk';
import ora from 'ora';
import { CommandContext } from '../core/factory';
import { SkillInstaller } from '../installer';
import { SecurityScanner } from '../scanner';

export async function handleInstall(ctx: CommandContext, skill: string) {
  ctx.io.log(chalk.blue(`🚀 Initializing install for skill: ${chalk.bold(skill)}\n`));
  
  const fetchSpinner = ora('Fetching remote skill from registry...').start();
  try {
    const { content, version } = await SkillInstaller.fetchRemoteSkill(skill);
    fetchSpinner.succeed('Skill downloaded successfully.');

    const auditSpinner = ora('Scanning for prompt injections targeting your AI...').start();
    await new Promise(r => setTimeout(r, 600));
    const auditResult = SecurityScanner.audit(content);
    
    if (!auditResult.isSafe) {
      auditSpinner.fail(chalk.red('Security Audit FAILED!'));
      ctx.io.error(chalk.red('❌ The following threats were detected:'));
      auditResult.threats.forEach(t => ctx.io.error(chalk.red(`   - ${t}`)));
      ctx.io.error(chalk.red('Installation aborted to protect your environment.'));
      ctx.process.exit(1);
    }
    auditSpinner.succeed(chalk.green('Skill audited: No malicious prompts found.'));

    const installSpinner = ora('Writing to local .agents/skills directory...').start();
    const savePath = SkillInstaller.saveSkillLocal(skill, content, version);
    installSpinner.succeed(`Successfully installed ${chalk.bold(skill)}!`);
    ctx.io.log(chalk.gray(`\nLocation: ${savePath}`));
  } catch (err) {
    fetchSpinner.fail(chalk.red('Installation failed.'));
    ctx.io.error(chalk.red(`Error: ${(err as Error).message}`));
  }
}
