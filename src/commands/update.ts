import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { CommandContext } from '../core/factory';
import { SkillInstaller } from '../installer';
import { SecurityScanner } from '../scanner';

export async function handleUpdate(ctx: CommandContext, skillName?: string) {
  const configPath = path.join(process.cwd(), 'agentpm.json');
  if (!fs.existsSync(configPath)) {
    ctx.io.error(chalk.red('No agentpm.json found. Run agentpm init first.'));
    ctx.process.exit(1);
    return;
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const skills: Record<string, string> = config.skills ?? {};
  const toUpdate = skillName ? [skillName] : Object.keys(skills);

  if (toUpdate.length === 0) {
    ctx.io.log(chalk.yellow('No skills installed. Run agentpm install <skill>'));
    return;
  }

  let updated = 0, failed = 0;
  for (const name of toUpdate) {
    const spinner = ora(`Updating ${chalk.cyan(name)}...`).start();
    try {
      const { content, version } = await SkillInstaller.fetchRemoteSkill(name);
      const currentVersion = SkillInstaller.getInstalledVersion(name);

      if (currentVersion === version) {
        spinner.info(chalk.gray(`${name} is already up-to-date (v${version})`));
        continue;
      }

      const { isSafe, threats } = SecurityScanner.audit(content);
      if (!isSafe) {
        spinner.fail(chalk.red(`${name} failed security audit - update blocked!`));
        threats.forEach(t => ctx.io.log(chalk.red(`  • ${t}`)));
        failed++;
        continue;
      }

      SkillInstaller.saveSkillLocal(name, content, version);
      spinner.succeed(chalk.green(`${name}: v${currentVersion} -> v${version}`));
      updated++;
    } catch (err) {
      spinner.fail(chalk.red(`Failed to update ${name}: ${(err as Error).message}`));
      failed++;
    }
  }

  ctx.io.log(chalk.cyan(`\nUpdate complete: ${updated} updated, ${failed} failed.`));
}
