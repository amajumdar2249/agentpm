#!/usr/bin/env node

import { Command } from 'commander';
import { defaultContext } from './core/factory';
import path from 'path';
import chalk from 'chalk';
import fs from 'fs';
import { VM } from 'vm2';
import { SecurityScanner } from './scanner';

const program = new Command();
const ctx = defaultContext;

program
  .name('agentpmx')
  .description('Securely execute an AI skill playbook or script in an isolated sandbox')
  .argument('<file>', 'Path to the playbook or script to execute')
  .action(async (file) => {
    try {
      let content = '';
      let isRemote = false;

      if (file.startsWith('http://') || file.startsWith('https://')) {
        isRemote = true;
        ctx.io.log(chalk.cyan(`🌐 Fetching remote script: ${file}...`));
        const res = await fetch(file);
        if (!res.ok) {
           ctx.io.error(chalk.red(`Failed to fetch remote script: ${res.statusText}`));
           process.exit(1);
        }
        content = await res.text();
      } else {
        const fullPath = path.resolve(process.cwd(), file);
        if (fs.existsSync(fullPath)) {
          content = fs.readFileSync(fullPath, 'utf8');
        } else {
          // Maybe it's a skill name from the registry?
          ctx.io.log(chalk.cyan(`🔍 Fetching skill '${file}' from registry...`));
          try {
            const { SkillInstaller } = require('./installer');
            const fetched = await SkillInstaller.fetchRemoteSkill(file);
            content = fetched.content;
            isRemote = true;
          } catch (e: any) {
            ctx.io.error(chalk.red(`Could not find local file or remote skill: ${file}`));
            process.exit(1);
          }
        }
      }
      
      // Perform security audit first
      const audit = SecurityScanner.audit(content);
      if (!audit.isSafe) {
        ctx.io.error(chalk.red('❌ SECURITY AUDIT FAILED ❌'));
        ctx.io.error(chalk.red(`Threats detected: ${audit.threats.join(', ')}`));
        ctx.io.error(chalk.red('Execution blocked by AgentPM Sandbox.'));
        process.exit(1);
      }

      ctx.io.log(chalk.cyan(`\n🛡️  Initializing vm2 Sandbox for ${file}...`));
      
      const vm = new VM({
        timeout: 5000,
        sandbox: {
          console: {
            log: (...args: any[]) => ctx.io.log(chalk.gray('[Sandbox]'), ...args),
            error: (...args: any[]) => ctx.io.error(chalk.red('[Sandbox]'), ...args)
          }
        },
        eval: false,
        wasm: false,
      });

      // If it's markdown, extract JS/TS blocks. If it's a JS file, run it directly.
      if (file.endsWith('.md')) {
        const jsRegex = /```(javascript|js|typescript|ts)\n([\s\S]*?)```/g;
        let match;
        let found = false;
        
        while ((match = jsRegex.exec(content)) !== null) {
          found = true;
          const code = match[2];
          ctx.io.log(chalk.yellow('\nExecuting JavaScript block...'));
          try {
            vm.run(code);
          } catch (e: any) {
             ctx.io.error(chalk.red(`Sandbox execution error: ${e.message}`));
          }
        }
        
        if (!found) {
          ctx.io.log(chalk.gray('No executable JavaScript blocks found in this playbook.'));
        }
      } else if (file.endsWith('.js')) {
        try {
          vm.run(content);
        } catch (e: any) {
           ctx.io.error(chalk.red(`Sandbox execution error: ${e.message}`));
        }
      } else {
         ctx.io.error(chalk.yellow(`Unsupported file type for agentpmx sandbox.`));
      }

    } catch (err: any) {
       ctx.io.error(chalk.red(`Execution failed: ${err.message}`));
    }
  });

program.parse(process.argv);
