import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { CommandContext } from '../core/factory';

export async function handleDoctor(ctx: CommandContext) {
  ctx.io.log(chalk.cyan('\n🩺 AgentPM Doctor\n'));

  const checks = [
    {
      label: 'agentpm.json exists',
      pass: fs.existsSync(path.join(process.cwd(), 'agentpm.json')),
      fix: 'Run: agentpm init'
    },
    {
      label: '.agents/skills/ directory exists',
      pass: fs.existsSync(path.join(process.cwd(), '.agents', 'skills')),
      fix: 'Run: agentpm init'
    },
    {
      label: 'agentpm.lock exists',
      pass: fs.existsSync(path.join(process.cwd(), 'agentpm.lock')),
      fix: 'Will be created on next agentpm install'
    },
    {
      label: 'Node.js version >= 18',
      pass: parseInt(process.version.slice(1)) >= 18,
      fix: 'Upgrade Node.js to v18+'
    }
  ];

  for (const c of checks) {
    ctx.io.log(`${c.pass ? chalk.green('✅') : chalk.red('❌')} ${c.label}`);
    if (!c.pass) ctx.io.log(chalk.gray(`     Fix: ${c.fix}`));
  }

  // Network check
  const netSpinner = ora('Checking registry connectivity...').start();
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(
      'https://raw.githubusercontent.com/amajumdar2249/agentpm-registry/main/index.json', 
      { method: 'HEAD', signal: controller.signal }
    );
    clearTimeout(t);
    if (res.ok) {
      netSpinner.succeed('Registry is reachable');
    } else {
      netSpinner.warn(`Registry returned HTTP ${res.status}`);
    }
  } catch {
    netSpinner.fail('Cannot reach registry (check internet connection)');
  }

  ctx.io.log(chalk.gray('\nAll checks complete.\n'));
}
