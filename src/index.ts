#!/usr/bin/env node

// ============================================================
// AgentPM — The Package Manager for AI Agents
// ============================================================

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { scanContent, scanWorkspace } from './scanner';
import { fetchSkillContent, searchSkills, toSlug, POPULAR_SKILLS } from './registry';
import { registerSkillsShCommand } from './commands/importSkillsSh';
import { AgentPmManifest, Severity } from './types';

const program = new Command();

program
  .name('agentpm')
  .description('Agent Package Manager - The secure package manager for AI Skills and Prompts')
  .version('1.3.0');

/**
 * Helper to get or create the project agentpm.json manifest
 */
function getManifestPath(): string {
  return path.join(process.cwd(), 'agentpm.json');
}

function loadManifest(): AgentPmManifest {
  const p = getManifestPath();
  if (fs.existsSync(p)) {
    try {
      return JSON.parse(fs.readFileSync(p, 'utf-8'));
    } catch {
      // Fallback
    }
  }
  return {
    name: path.basename(process.cwd()),
    version: '1.0.0',
    description: 'Agentic AI environment configured with AgentPM',
    skills: {},
  };
}

function saveManifest(manifest: AgentPmManifest) {
  fs.writeFileSync(getManifestPath(), JSON.stringify(manifest, null, 2), 'utf-8');
}

// ------------------------------------------------------------
// 1. INIT COMMAND
// ------------------------------------------------------------
program
  .command('init')
  .description('Initialize agentpm in the current workspace')
  .action(() => {
    const manifest = loadManifest();
    saveManifest(manifest);

    const skillsDir = path.join(process.cwd(), '.agents', 'skills');
    if (!fs.existsSync(skillsDir)) {
      fs.mkdirSync(skillsDir, { recursive: true });
    }

    console.log(chalk.green('✔ Initialized AgentPM workspace.'));
    console.log(chalk.gray(`  Created ${chalk.white('agentpm.json')} and ${chalk.white('.agents/skills/')}`));
  });

// ------------------------------------------------------------
// 2. INSTALL COMMAND
// ------------------------------------------------------------
program
  .command('install')
  .description('Download, security-audit, and install an AI skill into .agents/skills/')
  .argument('<skill>', 'Skill name or repository URL to install')
  .action(async (skillName: string) => {
    console.log(chalk.blue(`🚀 Initializing install for skill: ${chalk.bold(skillName)}`));
    console.log(chalk.cyan('📡 Fetching skill package from agentpm-registry...'));

    try {
      const skillPkg = await fetchSkillContent(skillName);

      console.log(chalk.yellow('🔍 Scanning for prompt injections, jailbreaks & data exfiltration...'));
      const findings = scanContent(skillPkg.content, skillName);

      const criticals = findings.filter((f) => f.severity === Severity.CRITICAL);
      const highs = findings.filter((f) => f.severity === Severity.HIGH);

      if (criticals.length > 0) {
        console.log(chalk.bgRed.white.bold('\n ❌ SECURITY ALERT: MALICIOUS PROMPT BLOCKED '));
        criticals.forEach((c) => console.log(chalk.red(`  - [${c.severity}] ${c.title} (line ${c.line})`)));
        console.log(chalk.red.bold('\nInstallation aborted due to high security risk.\n'));
        process.exit(1);
      }

      if (highs.length > 0) {
        console.log(chalk.yellow('⚠ Warning: Potential risk patterns detected in prompt:'));
        highs.forEach((h) => console.log(chalk.yellow(`  - ${h.title}`)));
      } else {
        console.log(chalk.green('✅ Zero-Trust Audit Passed: No malicious prompts found.'));
      }

      // Save skill file to .agents/skills/<skill-name>.md
      const skillsDir = path.join(process.cwd(), '.agents', 'skills');
      if (!fs.existsSync(skillsDir)) {
        fs.mkdirSync(skillsDir, { recursive: true });
      }

      const cleanFileName = toSlug(skillName) + '.md';
      const targetPath = path.join(skillsDir, cleanFileName);
      fs.writeFileSync(targetPath, skillPkg.content, 'utf-8');

      // Update agentpm.json manifest
      const manifest = loadManifest();
      manifest.skills[skillName] = skillPkg.version || '1.0.0';
      saveManifest(manifest);

      console.log(chalk.green.bold(`\n📦 Successfully installed ${skillName} (v${skillPkg.version})!`));
      console.log(chalk.gray(`  Location: .agents/skills/${cleanFileName}`));
      console.log(chalk.gray(`  Updated:  agentpm.json\n`));
    } catch (err: any) {
      console.error(chalk.red(`\n✗ Installation failed: ${err.message}`));
      process.exit(1);
    }
  });

// ------------------------------------------------------------
// 3. LIST COMMAND
// ------------------------------------------------------------
program
  .command('list')
  .description('List installed agent skills in the current workspace')
  .action(() => {
    const manifest = loadManifest();
    const installed = Object.entries(manifest.skills);

    console.log(chalk.cyan.bold('\n📄 Installed AI Agent Skills:\n'));
    if (installed.length === 0) {
      console.log(chalk.gray('  No skills installed yet. Run ') + chalk.white('agentpm install <skill>') + chalk.gray(' to get started.\n'));
      return;
    }

    for (const [skill, version] of installed) {
      console.log(`  ${chalk.green('✔')} ${chalk.bold(skill)} ${chalk.gray(`(v${version})`)}`);
    }
    console.log('');
  });

// ------------------------------------------------------------
// 4. SEARCH COMMAND
// ------------------------------------------------------------
program
  .command('search')
  .description('Search skills from agentpm-registry')
  .argument('<query>', 'Search query term')
  .action(async (query: string) => {
    console.log(chalk.cyan(`🔍 Searching registry for: "${query}"...\n`));
    const results = await searchSkills(query);

    if (results.length === 0) {
      console.log(chalk.yellow('No skills found matching that query.\n'));
      return;
    }

    for (const r of results) {
      console.log(`${chalk.green.bold(r.name)} ${chalk.gray(`(v${r.version})`)}`);
      console.log(`  ${chalk.white(r.description)}`);
      if (r.tags && r.tags.length > 0) {
        console.log(`  ${chalk.dim('Tags: ' + r.tags.join(', '))}`);
      }
      console.log('');
    }
  });

// ------------------------------------------------------------
// 5. AUDIT COMMAND
// ------------------------------------------------------------
program
  .command('audit')
  .description('Audit all local workspace skills and prompts for prompt injections')
  .action(() => {
    console.log(chalk.cyan('\n🛡️  Auditing workspace AI skills and prompts for security risks...\n'));
    const summary = scanWorkspace(process.cwd());

    console.log(chalk.gray(`Scanned ${summary.totalFiles} skill file(s).`));

    if (summary.totalFindings === 0) {
      console.log(chalk.green.bold('✔ 0 Security vulnerabilities found. Workspace is secure!\n'));
      return;
    }

    console.log(chalk.yellow.bold(`\n⚠ Found ${summary.totalFindings} potential risk(s):\n`));
    for (const f of summary.findings) {
      const color = f.severity === Severity.CRITICAL ? chalk.red.bold : chalk.yellow;
      console.log(color(`[${f.severity}] ${f.title}`));
      console.log(chalk.gray(`  File: ${f.filePath}${f.line ? `:${f.line}` : ''}`));
      console.log(chalk.white(`  Details: ${f.description}`));
      if (f.evidence) {
        console.log(chalk.dim(`  Evidence: ${f.evidence.trim().substring(0, 70)}`));
      }
      console.log(chalk.cyan(`  Fix: ${f.remediation}\n`));
    }
  });

// ------------------------------------------------------------
// 6. IMPORT-SKILLS-SH COMMAND (Automated Ingestion Pipeline)
// ------------------------------------------------------------
registerSkillsShCommand(program);

program.parse();
