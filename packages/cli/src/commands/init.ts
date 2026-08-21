import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { CommandContext } from '../core/factory';

export async function handleInit(ctx: CommandContext) {
  const initSpinner = ora('Initializing AgentPM Workspace...').start();
  const configPath = path.join(ctx.process.cwd(), 'agentpm.json');
  const agentsDir = path.join(ctx.process.cwd(), '.agents');
  const skillsDir = path.join(agentsDir, 'skills');

  try {
    await ctx.fs.promises.mkdir(skillsDir, { recursive: true });
    
    const configTemplate = {
      name: "my-agentic-workspace",
      version: "1.0.0",
      description: "An isolated environment for autonomous AI agents",
      skills: {}
    };
    
    await ctx.fs.promises.writeFile(configPath, JSON.stringify(configTemplate, null, 2), 'utf8');
    
    initSpinner.succeed(chalk.green('AgentPM Workspace Initialized 🌌'));
    ctx.io.log(chalk.cyan(`\nCreated:`));
    ctx.io.log(chalk.gray(`  📄 agentpm.json`));
    ctx.io.log(chalk.gray(`  📂 .agents/skills/`));
    ctx.io.log(chalk.blue(`\nReady to orchestrate AI. Try: ${chalk.bold('agentpm install blog-write')}`));
  } catch (err) {
    initSpinner.fail(chalk.red('Failed to initialize workspace.'));
    ctx.io.error(err);
  }
}
