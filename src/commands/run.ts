import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { CommandContext } from '../core/factory';
import { SecurityScanner } from '../scanner';
import { SkillInstaller } from '../installer';

interface ScriptBlock {
  lang: string;
  code: string;
}

export async function handleRun(ctx: CommandContext, skillName: string) {
  const safeName = skillName.replace(/[\/\@]/g, '-').replace(/^-/, '').replace(/\s+/g, '-');
  let skillPath = path.join(ctx.process.cwd(), '.agents', 'skills', `${safeName}.md`);

  // Auto-install if not present locally
  if (!ctx.fs.existsSync(skillPath)) {
    ctx.io.log(chalk.yellow(`⚠️ Skill '${skillName}' is not installed locally in this workspace.`));
    const autoInstallSpinner = ora(`Auto-fetching & installing '${skillName}'...`).start();
    try {
      const { content, version } = await SkillInstaller.fetchRemoteSkill(skillName);
      const auditResult = SecurityScanner.audit(content);
      if (!auditResult.isSafe) {
        autoInstallSpinner.fail(chalk.red('Security audit failed. Execution aborted.'));
        ctx.process.exit(1);
      }
      skillPath = SkillInstaller.saveSkillLocal(skillName, content, version);
      autoInstallSpinner.succeed(`Successfully auto-installed ${skillName}!`);
    } catch (err) {
      autoInstallSpinner.fail(chalk.red(`Failed to auto-install skill: ${(err as Error).message}`));
      return;
    }
  }

  try {
    const rawContent = ctx.fs.readFileSync(skillPath, 'utf8');
    ctx.io.log(chalk.cyan(`🌌 Reading playbook: ${chalk.bold(skillName)}...\n`));

    const scripts = extractScripts(rawContent);

    if (scripts.length === 0) {
      // It's a pure prompt playbook. Render it nicely in the terminal.
      ctx.io.log(chalk.gray('--- Playbook Instructions ---'));
      ctx.io.log(rawContent);
      ctx.io.log(chalk.gray('-----------------------------'));
      return;
    }

    ctx.io.log(chalk.yellow(`📝 Found ${scripts.length} executable script(s) in this playbook.`));

    for (let i = 0; i < scripts.length; i++) {
      const script = scripts[i];
      ctx.io.log(chalk.blue(`\n[Script ${i + 1}/${scripts.length}] Language: ${script.lang}`));
      ctx.io.log(chalk.gray('```' + script.lang));
      ctx.io.log(chalk.white(script.code.trim()));
      ctx.io.log(chalk.gray('```'));

      // Perform a final scan of the code block itself
      const audit = SecurityScanner.audit(script.code);
      if (!audit.isSafe) {
        ctx.io.log(chalk.red(`❌ Security check failed on script block! Threats: ${audit.threats.join(', ')}`));
        ctx.io.log(chalk.red('Execution of this block is blocked.'));
        continue;
      }

      // Execute script block safely
      const execSpinner = ora('Running script block...').start();
      await new Promise<void>((resolve) => {
        let runnerCommand = '';
        if (script.lang === 'bash' || script.lang === 'sh') {
          runnerCommand = `bash -c "${script.code.replace(/"/g, '\\"')}"`;
        } else if (script.lang === 'python' || script.lang === 'py') {
          runnerCommand = `python -c "${script.code.replace(/"/g, '\\"')}"`;
        } else {
          execSpinner.info(chalk.yellow(`Execution not supported for language: ${script.lang}`));
          resolve();
          return;
        }

        ctx.exec(runnerCommand, {}, (err, stdout, stderr) => {
          if (err) {
            execSpinner.fail(chalk.red('Execution failed!'));
            ctx.io.error(chalk.red(stderr || err.message));
          } else {
            execSpinner.succeed(chalk.green('Execution completed.'));
            if (stdout) {
              ctx.io.log(chalk.gray('\nOutput:'));
              ctx.io.log(stdout);
            }
          }
          resolve();
        });
      });
    }

  } catch (err) {
    ctx.io.error(chalk.red(`Failed to execute skill: ${(err as Error).message}`));
  }
}

function extractScripts(markdown: string): ScriptBlock[] {
  const blocks: ScriptBlock[] = [];
  const regex = /```(bash|sh|python|py)\n([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(markdown)) !== null) {
    blocks.push({
      lang: match[1],
      code: match[2]
    });
  }
  return blocks;
}
