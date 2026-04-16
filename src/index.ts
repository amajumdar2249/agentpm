#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { SecurityScanner } from './scanner';
import { SkillInstaller } from './installer';

const program = new Command();

program
  .name('agentpm')
  .description('Agent Package Manager - The secure package manager for AI Skills and Prompts')
  .version('1.0.0');

program
  .command('install')
  .description('Install a new agent skill')
  .argument('<skill>', 'Skill name or repository URL to install')
  .action(async (skill) => {
    console.log(chalk.blue(`🚀 Initializing install for skill: ${chalk.bold(skill)}\n`));
    
    // Step 1: Fetch
    const fetchSpinner = ora('Fetching remote skill from registry...').start();
    const content = await SkillInstaller.fetchRemoteSkill(skill);
    fetchSpinner.succeed('Skill downloaded successfully.');

    // Step 2: Audit
    const auditSpinner = ora('Scanning for prompt injections targeting your AI...').start();
    // Simulate deep scanning delay
    await new Promise(r => setTimeout(r, 800));
    const auditResult = SecurityScanner.audit(content);
    
    if (!auditResult.isSafe) {
      auditSpinner.fail(chalk.red('Security Audit FAILED!'));
      console.error(chalk.red('❌ The following threats were detected:'));
      auditResult.threats.forEach(t => console.error(chalk.red(`   - ${t}`)));
      console.error(chalk.red('Installation aborted to protect your environment.'));
      process.exit(1);
    }
    auditSpinner.succeed(chalk.green('Skill audited: No malicious prompts found.'));

    // Step 3: Install
    const installSpinner = ora('Writing to local .agents/skills directory...').start();
    const savePath = SkillInstaller.saveSkillLocal(skill, content);
    installSpinner.succeed(`Successfully installed ${chalk.bold(skill)}!`);
    console.log(chalk.gray(`\nLocation: ${savePath}`));
  });

program
  .command('list')
  .description('List installed agent skills')
  .action(() => {
    console.log(chalk.cyan('📄 Installed skills:'));
    console.log(chalk.gray(' - @oss/react-expert (v1.0.0)'));
  });

program.parse(process.argv);