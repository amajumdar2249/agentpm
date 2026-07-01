import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import { CommandContext } from '../core/factory';

export interface McpTarget {
  name: string;
  configPath: string;
}

export function getMcpTargets(): McpTarget[] {
  const home = os.homedir();
  const platform = os.platform();

  let claudePath = '';
  if (platform === 'win32') {
    claudePath = path.join(home, 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json');
  } else if (platform === 'darwin') {
    claudePath = path.join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  } else {
    claudePath = path.join(home, '.config', 'Claude', 'claude_desktop_config.json');
  }

  return [
    {
      name: 'Claude Desktop',
      configPath: claudePath
    },
    {
      name: 'Cursor IDE (Global)',
      configPath: path.join(home, '.cursor', 'mcp.json')
    },
    {
      name: 'Windsurf IDE',
      configPath: path.join(home, '.codeium', 'windsurf', 'mcp_config.json')
    }
  ];
}

export function handleSetupMcp(ctx: CommandContext): void {
  ctx.io.log(chalk.bold.cyan('⚡ AgentPM Automated MCP Configuration Injector'));
  ctx.io.log('Scanning your system for installed AI Coding Assistants...\n');

  const targets = getMcpTargets();
  let configuredCount = 0;

  for (const target of targets) {
    try {
      const configDir = path.dirname(target.configPath);
      
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      let existingConfig: any = { mcpServers: {} };
      if (fs.existsSync(target.configPath)) {
        try {
          const raw = fs.readFileSync(target.configPath, 'utf-8');
          existingConfig = JSON.parse(raw);
          if (!existingConfig.mcpServers) {
            existingConfig.mcpServers = {};
          }
        } catch (parseErr) {
          ctx.io.log(chalk.yellow(`⚠ Could not parse JSON in ${target.configPath}, initializing new config structure.`));
        }
      }

      existingConfig.mcpServers['agentpm'] = {
        command: 'npx',
        args: ['-y', '@amajumdar2249/agentpm', "mcp"]
      };

      fs.writeFileSync(target.configPath, JSON.stringify(existingConfig, null, 2), 'utf-8');
      ctx.io.log(`${chalk.green('✔')} Configured ${chalk.bold(target.name)}: ${chalk.gray(target.configPath)}`);
      configuredCount++;
    } catch (err: any) {
      ctx.io.error(`${chalk.red('✖')} Failed to configure ${target.name}: ${err.message}`);
    }
  }

  ctx.io.log(`\n${chalk.bold.green('✔ Success!')} Injected AgentPM MCP server into ${configuredCount} AI assistant environment(s).`);
  ctx.io.log(`Please restart your AI assistants (Claude / Cursor / Windsurf) to activate the AgentPM skills server.`);
}
