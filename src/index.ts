#!/usr/bin/env node

import { Command } from 'commander';
import { defaultContext } from './core/factory';
import { handleInit } from './commands/init';
import { handleInstall } from './commands/install';
import { handleSearch } from './commands/search';
import { handleList } from './commands/list';
import { handleValidate } from './commands/validate';
import { handleRate } from './commands/rate';
import { handleRun } from './commands/run';
import { handleGenerate } from './commands/generate';
import { handlePublish } from './commands/publish';
import { handleAudit } from './commands/audit';

const program = new Command();
const ctx = defaultContext;

program
  .name('agentpm')
  .description('AgentPM: The Neural Registry for Autonomous AI')
  .version('1.2.0');

// 1. init command
program
  .command('init')
  .description('Scaffold a new agentic workspace with an agentpm.json configuration file')
  .action(() => handleInit(ctx));

// 2. install command
program
  .command('install')
  .description('Install a new agent skill')
  .argument('<skill>', 'Skill name or repository URL to install')
  .action((skill) => handleInstall(ctx, skill));

// 3. search command
program
  .command('search')
  .description('Search for agent skills in registry using fuzzy matching')
  .argument('<query>', 'Search term')
  .option('-t, --tag <tag>', 'Filter results by tag')
  .option('-n, --limit <n>', 'Max results to show', '10')
  .option('-r, --remote', 'Search remote registry directly instead of local cache')
  .action(async (query, options) => await handleSearch(ctx, query, options));

// 4. list command
program
  .command('list')
  .description('List installed agent skills')
  .action(() => handleList(ctx));

// 5. validate command
program
  .command('validate')
  .alias('lint')
  .description('Validate a skill JSON file against the standardized metadata schema')
  .argument('<filePath>', 'Path to the skill JSON file to validate')
  .action((filePath) => handleValidate(ctx, filePath));

// 6. rate command
program
  .command('rate')
  .description('Submit a rating and review for a skill via GitHub Issues')
  .argument('<skillName>', 'Name or slug of the skill to rate')
  .action((skillName) => handleRate(ctx, skillName));

// 7. run command
program
  .command('run')
  .description('Execute script blocks or print instructions from a skill playbook')
  .argument('<skillName>', 'Name or slug of the skill to execute')
  .action((skillName) => handleRun(ctx, skillName));

// 8. generate command
program
  .command('generate')
  .description('Generate a new AI skill playbook using offline templates or Gemini')
  .argument('<skillName>', 'Name of the skill to generate')
  .argument('[prompt]', 'Goal or description of what the skill does')
  .action((skillName, prompt) => handleGenerate(ctx, skillName, prompt));

// 9. publish command
program
  .command('publish')
  .description('Publish a skill from a local SKILL.md to the registry')
  .argument('[skillDir]', 'Path to the directory containing SKILL.md')
  .action((skillDir) => handlePublish(ctx, skillDir));

// 10. audit command
program
  .command('audit')
  .description('Audit a skill file or directory for security threats')
  .argument('[path]', 'Path to file or directory. Defaults to .agents/skills')
  .action((path) => handleAudit(ctx, path || '.agents/skills'));

// 11. mcp command
program
  .command('mcp')
  .description('Start the Model Context Protocol (MCP) server over stdio')
  .action(async () => {
    const { startMcpServer } = await import('./mcp');
    await startMcpServer();
  });

program
  .command('setup-mcp')
  .alias('setup')
  .description('Automatically inject AgentPM MCP server config into Claude Desktop, Cursor, and Windsurf')
  .action(async () => {
    const { handleSetupMcp } = await import('./commands/setup-mcp');
    handleSetupMcp(ctx);
  });

// 12. info command
program
  .command('info')
  .description('Show detailed information about a skill without installing it')
  .argument('<skill>', 'Name of the skill to inspect')
  .action(async (skillName) => {
    const { handleInfo } = await import('./commands/info');
    handleInfo(ctx, skillName);
  });

// 13. doctor command
program
  .command('doctor')
  .description('Diagnose AgentPM installation and environment issues')
  .action(async () => {
    const { handleDoctor } = await import('./commands/doctor');
    handleDoctor(ctx);
  });

// 14. uninstall command
program
  .command('uninstall')
  .description('Remove an installed skill from your workspace')
  .argument('<skill>', 'Name of the skill to uninstall')
  .action(async (skillName) => {
    const { handleUninstall } = await import('./commands/uninstall');
    handleUninstall(ctx, skillName);
  });

// 15. update command
program
  .command('update')
  .description('Update installed skills to their latest versions')
  .argument('[skill]', 'Name of a specific skill to update (omit to update all)')
  .action(async (skillName) => {
    const { handleUpdate } = await import('./commands/update');
    handleUpdate(ctx, skillName);
  });

program
  .command('ui')
  .description('Launch the interactive Terminal UI')
  .argument('[query]', 'Optional initial search query')
  .action(async (query) => {
    const { handleUI } = await import('./commands/ui');
    await handleUI(ctx, query);
  });

program.parse(process.argv);
