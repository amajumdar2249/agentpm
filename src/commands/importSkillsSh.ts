/**
 * importSkillsSh.ts
 * -----------------
 * CLI command handler for `agentpm import-skills-sh`
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as path from 'path';
import * as fs from 'fs';
import { syncSkillsSh } from '../sync/skillsShSync';

export function registerSkillsShCommand(program: Command): void {
  program
    .command('import-skills-sh')
    .description('Clone and import the skills.sh AI skills directory into local registry')
    .option('-o, --out <dir>', 'Output destination directory', './registry/packages')
    .option('-f, --from <dir>', 'Source directory for local skills (default checks ../skills_sh_extracted/all_skills)')
    .option('-c, --concurrency <n>', 'Number of concurrent workers (1-10)', '5')
    .option('-l, --limit <n>', 'Optional maximum number of skills to import')
    .action(async (options: { out: string; from?: string; concurrency: string; limit?: string }) => {
      console.log(chalk.cyan.bold('\n🌐 AgentPM Skills Ingestion & Seeding Pipeline\n'));
      console.log(chalk.gray(`  Target output: ${chalk.white(options.out)}`));
      if (options.from) {
        console.log(chalk.gray(`  Source folder: ${chalk.white(options.from)}`));
      }
      console.log(chalk.gray(`  Concurrency:   ${chalk.white(options.concurrency)} workers\n`));

      const spinner = ora('Initializing skills ingestion pipeline...').start();
      const startTime = Date.now();

      try {
        const result = await syncSkillsSh({
          outDir: options.out,
          localDir: options.from,
          concurrency: Number(options.concurrency) || 5,
          limit: options.limit ? Number(options.limit) : undefined,
          oidcToken: process.env.VERCEL_OIDC_TOKEN,
          onProgress: (done, total, status) => {
            spinner.text = `Importing skills [${done}/${total}] — Last: ${status}`;
          },
        });

        const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
        spinner.succeed(chalk.green.bold(`\n✔ Ingestion complete in ${durationSec}s!`));

        console.log(chalk.dim('\n' + '─'.repeat(50)));
        console.log(`  ${chalk.green('✔')} ${chalk.bold(result.saved.toString())} skills verified & saved into registry`);
        console.log(`  ${chalk.yellow('↷')} ${chalk.bold(result.skipped.toString())} already cached / skipped`);
        if (result.quarantined > 0) {
          console.log(`  ${chalk.magenta('🛡')} ${chalk.bold(result.quarantined.toString())} quarantined (blocked due to prompt injection risks)`);
        }
        if (result.failed.length > 0) {
          console.log(`  ${chalk.red('✗')} ${chalk.bold(result.failed.length.toString())} failed`);
        }
        console.log(chalk.dim('─'.repeat(50) + '\n'));
        console.log(chalk.cyan(`All skills successfully available in: ${options.out}\n`));
      } catch (err: any) {
        spinner.fail(chalk.red(`Ingestion failed: ${err.message}`));
        process.exit(1);
      }
    });
}
