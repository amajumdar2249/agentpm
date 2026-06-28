import chalk from 'chalk';
import ora from 'ora';
import { CommandContext } from '../core/factory';
import { SkillInstaller } from '../installer';

export async function handleUninstall(ctx: CommandContext, skillName: string) {
  const spinner = ora(`Uninstalling ${chalk.cyan(skillName)}...`).start();
  try {
    const removed = SkillInstaller.uninstallSkill(skillName);
    if (removed) {
      spinner.succeed(chalk.green(`✅ Skill '${skillName}' removed from workspace`));
      ctx.io.log(chalk.gray(`  📄 Deleted .agents/skills/${skillName}.md`));
      ctx.io.log(chalk.gray(`  📝 Updated agentpm.json and agentpm.lock`));
    } else {
      spinner.fail(chalk.yellow(`Skill '${skillName}' is not installed.`));
      ctx.io.log(chalk.blue(`Run ${chalk.bold('agentpm list')} to see installed skills.`));
    }
  } catch (err) {
    spinner.fail(chalk.red(`Uninstall failed: ${(err as Error).message}`));
  }
}
