import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { CommandContext } from '../core/factory';
import { SkillLinter } from '../linter';

export function handleValidate(ctx: CommandContext, filePath: string) {
  const validationSpinner = ora(`Validating ${filePath}...`).start();
  const absolutePath = path.resolve(ctx.process.cwd(), filePath);
  
  const result = SkillLinter.validateFile(absolutePath);
  
  if (result.isValid) {
    validationSpinner.succeed(chalk.green(`🌌 Validation PASSED! The skill metadata is compliant.`));
  } else {
    validationSpinner.fail(chalk.red(`❌ Validation FAILED! Detected errors in skill structure:`));
    result.errors.forEach((err: string) => ctx.io.log(chalk.red(`   - ${err}`)));
    ctx.process.exit(1);
  }
}
