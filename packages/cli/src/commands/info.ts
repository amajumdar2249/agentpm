import chalk from 'chalk';
import ora from 'ora';
import { CommandContext } from '../core/factory';
import { SkillInstaller } from '../installer';
import { SecurityScanner } from '../scanner';

export async function handleInfo(ctx: CommandContext, skillName: string) {
  const spinner = ora(`Fetching info for ${chalk.cyan(skillName)}...`).start();
  try {
    const { content, version } = await SkillInstaller.fetchRemoteSkill(skillName);
    const { isSafe, threats } = SecurityScanner.audit(content);
    spinner.succeed(chalk.green(`Skill info for: ${skillName}`));

    ctx.io.log(chalk.cyan('\n📦 Details:'));
    ctx.io.log(chalk.gray(`  Version:  ${version}`));
    ctx.io.log(chalk.gray(`  Size:     ${content.length.toLocaleString()} characters`));
    ctx.io.log(chalk.gray(`  Security: ${isSafe ? chalk.green('✅ SAFE') : chalk.red('⚠️ THREATS FOUND')}`));

    ctx.io.log(chalk.cyan('\n📄 Content Preview (first 300 chars):'));
    ctx.io.log(chalk.white('  ' + content.slice(0, 300).replace(/\n/g, '\n  ')));

    if (!isSafe) {
      ctx.io.log(chalk.red('\n⚠️ Security Issues Found:'));
      threats.forEach(t => ctx.io.log(chalk.red(`  • ${t}`)));
    }

    ctx.io.log(chalk.blue(`\nTo install: ${chalk.bold(`agentpm install ${skillName}`)}`));
  } catch (err) {
    spinner.fail(chalk.red(`Could not fetch info: ${(err as Error).message}`));
  }
}
