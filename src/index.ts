#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import { SecurityScanner } from './scanner';
import { SkillInstaller } from './installer';
import { SkillLinter } from './linter';
import { SkillSearcher } from './search';
import { BrowserUtils } from './utils/browser';

const program = new Command();

program
  .name('agentpm')
  .description('AgentPM: The Neural Registry for Autonomous AI')
  .version('1.1.0');

// 1. init command
program
  .command('init')
  .description('Scaffold a new agentic workspace with an agentpm.json configuration file')
  .action(async () => {
    const initSpinner = ora('Initializing AgentPM Workspace...').start();
    const configPath = path.join(process.cwd(), 'agentpm.json');
    const agentsDir = path.join(process.cwd(), '.agents');
    const skillsDir = path.join(agentsDir, 'skills');

    try {
      await fs.promises.mkdir(skillsDir, { recursive: true });
      
      const configTemplate = {
        name: "my-agentic-workspace",
        version: "1.0.0",
        description: "An isolated environment for autonomous AI agents",
        skills: {}
      };
      
      await fs.promises.writeFile(configPath, JSON.stringify(configTemplate, null, 2), 'utf8');
      
      initSpinner.succeed(chalk.green('AgentPM Workspace Initialized 🌌'));
      console.log(chalk.cyan(`\nCreated:`));
      console.log(chalk.gray(`  📄 agentpm.json`));
      console.log(chalk.gray(`  📂 .agents/skills/`));
      console.log(chalk.blue(`\nReady to orchestrate AI. Try: ${chalk.bold('agentpm install blog-write')}`));
    } catch (err) {
      initSpinner.fail(chalk.red('Failed to initialize workspace.'));
      console.error(err);
    }
  });

// 2. install command
program
  .command('install')
  .description('Install a new agent skill')
  .argument('<skill>', 'Skill name or repository URL to install')
  .action(async (skill) => {
    console.log(chalk.blue(`🚀 Initializing install for skill: ${chalk.bold(skill)}\n`));
    
    // Step 1: Fetch
    const fetchSpinner = ora('Fetching remote skill from registry...').start();
    try {
      const content = await SkillInstaller.fetchRemoteSkill(skill);
      fetchSpinner.succeed('Skill downloaded successfully.');

      // Step 2: Audit
      const auditSpinner = ora('Scanning for prompt injections targeting your AI...').start();
      await new Promise(r => setTimeout(r, 600));
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
    } catch (err) {
      fetchSpinner.fail(chalk.red('Installation failed.'));
      console.error(chalk.red(`Error: ${(err as Error).message}`));
    }
  });

// 3. search command
program
  .command('search')
  .description('Search for agent skills in registry using fuzzy matching')
  .argument('<query>', 'Search term')
  .action((query) => {
    const indexPath = path.join(__dirname, '..', 'registry', 'index.json');
    if (!fs.existsSync(indexPath)) {
      console.log(chalk.yellow('⚠️ Local registry index not found. Try compiling the seeder script first.'));
      return;
    }

    try {
      const raw = fs.readFileSync(indexPath, 'utf8');
      const index = JSON.parse(raw);
      
      console.log(chalk.cyan(`🔎 Searching registry for: "${query}"...\n`));
      
      const searcher = new SkillSearcher();
      searcher.indexSkills(index);
      const results = searcher.search(query);

      if (results.length === 0) {
        console.log(chalk.gray('No matching skills found in registry.'));
      } else {
        results.slice(0, 10).forEach((pkg: any) => {
          const matchPercent = Math.min(Math.round(pkg.score * 10), 100);
          console.log(chalk.green(`📦 ${chalk.bold(pkg.name)} (v${pkg.version}) `) + chalk.gray(`[Relevance: ${matchPercent}%]`));
          console.log(chalk.gray(`   Slug: ${pkg.slug}`));
          if (pkg.tags && pkg.tags.length > 0) {
            console.log(chalk.blue(`   Tags: ${pkg.tags.join(', ')}`));
          }
          console.log(chalk.white(`   ${pkg.description}`));
          console.log();
        });
        if (results.length > 10) {
          console.log(chalk.blue(`...and ${results.length - 10} more matches. Narrow down your search!`));
        }
      }
    } catch (err) {
      console.error(chalk.red(`Failed to search: ${(err as Error).message}`));
    }
  });

// 4. list command
program
  .command('list')
  .description('List installed agent skills')
  .action(() => {
    const configPath = path.join(process.cwd(), 'agentpm.json');
    if (!fs.existsSync(configPath)) {
      console.log(chalk.yellow('⚠️ Not an AgentPM workspace. Run: agentpm init'));
      return;
    }

    try {
      const raw = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(raw);
      const skills = config.skills || {};

      console.log(chalk.cyan('📄 Installed workspace skills:'));
      const keys = Object.keys(skills);
      if (keys.length === 0) {
        console.log(chalk.gray(' - (none installed yet)'));
      } else {
        keys.forEach(k => {
          console.log(chalk.green(` - ${chalk.bold(k)} (v${skills[k]})`));
        });
      }
    } catch (err) {
      console.error(chalk.red(`Failed to list: ${(err as Error).message}`));
    }
  });

// 5. validate command
program
  .command('validate')
  .alias('lint')
  .description('Validate a skill JSON file against the standardized metadata schema')
  .argument('<filePath>', 'Path to the skill JSON file to validate')
  .action((filePath) => {
    const validationSpinner = ora(`Validating ${filePath}...`).start();
    const absolutePath = path.resolve(process.cwd(), filePath);
    
    const result = SkillLinter.validateFile(absolutePath);
    
    if (result.isValid) {
      validationSpinner.succeed(chalk.green(`🌌 Validation PASSED! The skill metadata is compliant.`));
    } else {
      validationSpinner.fail(chalk.red(`❌ Validation FAILED! Detected errors in skill structure:`));
      result.errors.forEach((err: string) => console.log(chalk.red(`   - ${err}`)));
      process.exit(1);
    }
  });

// 6. rate command
program
  .command('rate')
  .description('Submit a rating and review for a skill via GitHub Issues')
  .argument('<skillName>', 'Name or slug of the skill to rate')
  .action(async (skillName) => {
    const indexPath = path.join(__dirname, '..', 'registry', 'index.json');
    if (!fs.existsSync(indexPath)) {
      console.log(chalk.yellow('⚠️ Local registry index not found. Run search or seed first to cache it.'));
      return;
    }

    try {
      const raw = fs.readFileSync(indexPath, 'utf8');
      const index = JSON.parse(raw);
      const pkg = index.find((item: any) => 
        item.slug.toLowerCase() === skillName.toLowerCase() || 
        item.name.toLowerCase() === skillName.toLowerCase()
      );

      if (!pkg) {
        console.log(chalk.red(`❌ Skill '${skillName}' not found in the registry.`));
        console.log(chalk.gray(`Please check the spelling or search using: ${chalk.bold('agentpm search <query>')}`));
        return;
      }

      console.log(chalk.cyan(`🚀 Opening GitHub Review portal for: ${chalk.bold(pkg.name)}...`));
      
      const title = `[Review] ${pkg.slug}`;
      const body = `## 🌌 Review for ${pkg.name} (${pkg.slug})

- **Rating:** 5/5 <!-- Please edit this: 1/5, 2/5, 3/5, 4/5, 5/5 -->
- **Reviewer:** @your-username

### ✍️ Review & Comments
(Write your detailed comments and feedback here...)
`;
      const url = `https://github.com/amajumdar2249/agentpm-registry/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;

      await BrowserUtils.open(url);
      console.log(chalk.green('🌌 Browser window opened successfully!'));
      console.log(chalk.gray(`If the browser did not open, visit: \n  ${url}`));
    } catch (err) {
      console.error(chalk.red(`Failed to trigger review: ${(err as Error).message}`));
    }
  });

// 7. mcp command
program
  .command('mcp')
  .description('Start the Model Context Protocol (MCP) server over stdio')
  .action(async () => {
    const { startMcpServer } = await import('./mcp');
    await startMcpServer();
  });

program.parse(process.argv);
