import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { CommandContext } from '../core/factory';
import { SecurityScanner } from '../scanner';

const ELIGIBLE_EXTENSIONS = ['.md', '.json', '.js', '.ts', '.py', '.sh', '.yml', '.yaml', '.txt'];
const IGNORED_DIRS = ['node_modules', '.git', 'dist', 'coverage', 'build', 'web'];

interface AuditFinding {
  filePath: string;
  lineNumber: number;
  lineContent: string;
  message: string;
}

export function handleAudit(ctx: CommandContext, targetPath: string) {
  const absolutePath = path.resolve(ctx.process.cwd(), targetPath);
  
  if (!fs.existsSync(absolutePath)) {
    ctx.io.log(chalk.red(`❌ Path does not exist: ${targetPath}`));
    ctx.process.exit(1);
    return;
  }

  const spinner = ora(`Auditing ${targetPath} for security threats...`).start();
  const findings: AuditFinding[] = [];
  let filesAuditedCount = 0;
  let hasError = false;
  let errorMessage = '';

  try {
    const stat = fs.statSync(absolutePath);

    if (stat.isFile()) {
      auditFile(absolutePath, findings);
      filesAuditedCount = 1;
    } else if (stat.isDirectory()) {
      filesAuditedCount = walkAndAudit(absolutePath, findings);
    }
  } catch (error) {
    hasError = true;
    errorMessage = (error as Error).message;
  }

  if (hasError) {
    spinner.fail(chalk.red(`❌ Audit process encountered an error:`));
    ctx.io.log(chalk.red(`   ${errorMessage}`));
    ctx.process.exit(1);
    return;
  }

  if (findings.length === 0) {
    spinner.succeed(chalk.green(`🌌 Audit PASSED! Audited ${filesAuditedCount} file(s). No security threats detected.`));
    ctx.process.exit(0);
  } else {
    spinner.fail(chalk.red(`❌ Audit FAILED! Found ${findings.length} security threat(s) across ${filesAuditedCount} file(s):`));
    
    findings.forEach(finding => {
      ctx.io.log(
        chalk.yellow(`\n⚠️  Threat detected in: `) + 
        chalk.cyan(`${finding.filePath}:${finding.lineNumber}`)
      );
      ctx.io.log(chalk.red(`   Details: ${finding.message}`));
      ctx.io.log(chalk.grey(`   Line: "${finding.lineContent.trim()}"`));
    });

    ctx.process.exit(1);
  }
}

function auditFile(filePath: string, findings: AuditFinding[]) {
  const ext = path.extname(filePath).toLowerCase();
  if (!ELIGIBLE_EXTENSIONS.includes(ext)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    const result = SecurityScanner.audit(line);
    if (!result.isSafe) {
      result.threats.forEach(threat => {
        findings.push({
          filePath,
          lineNumber: idx + 1,
          lineContent: line,
          message: threat
        });
      });
    }
  });
}

function walkAndAudit(dirPath: string, findings: AuditFinding[]): number {
  let fileCount = 0;
  
  function recurse(currentPath: string) {
    const files = fs.readdirSync(currentPath);
    
    for (const file of files) {
      const fullPath = path.join(currentPath, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!IGNORED_DIRS.includes(file)) {
          recurse(fullPath);
        }
      } else if (stat.isFile()) {
        const ext = path.extname(fullPath).toLowerCase();
        if (ELIGIBLE_EXTENSIONS.includes(ext)) {
          auditFile(fullPath, findings);
          fileCount++;
        }
      }
    }
  }

  recurse(dirPath);
  return fileCount;
}
