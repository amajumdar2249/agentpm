import path from 'path';
import chalk from 'chalk';
import { CommandContext } from '../core/factory';

export function handleList(ctx: CommandContext) {
  const configPath = path.join(ctx.process.cwd(), 'agentpm.json');
  if (!ctx.fs.existsSync(configPath)) {
    ctx.io.log(chalk.yellow('⚠️ Not an AgentPM workspace. Run: agentpm init'));
    return;
  }

  try {
    const raw = ctx.fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(raw);
    const skills = config.skills || {};

    ctx.io.log(chalk.cyan('📄 Installed workspace skills:'));
    const keys = Object.keys(skills);
    if (keys.length === 0) {
      ctx.io.log(chalk.gray(' - (none installed yet)'));
    } else {
      keys.forEach(k => {
        ctx.io.log(chalk.green(` - ${chalk.bold(k)} (v${skills[k]})`));
      });
    }
  } catch (err) {
    ctx.io.error(chalk.red(`Failed to list: ${(err as Error).message}`));
  }
}
