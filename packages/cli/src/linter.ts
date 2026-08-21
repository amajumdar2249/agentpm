import fs from 'fs';
import { SkillSchema } from './schema';
import { ZodError } from 'zod';

export interface LintResult {
  isValid: boolean;
  errors: string[];
}

export class SkillLinter {
  /**
   * Validates a raw JavaScript object against the SkillSchema.
   */
  public static validate(data: any): LintResult {
    const result = SkillSchema.safeParse(data);
    
    if (result.success) {
      return {
        isValid: true,
        errors: []
      };
    }

    const errors = this.formatZodError(result.error);
    return {
      isValid: false,
      errors
    };
  }

  /**
   * Validates a JSON file from disk.
   */
  public static validateFile(filePath: string): LintResult {
    try {
      if (!fs.existsSync(filePath)) {
        return {
          isValid: false,
          errors: [`File does not exist: ${filePath}`]
        };
      }

      const fileContent = fs.readFileSync(filePath, 'utf8');
      const parsedData = JSON.parse(fileContent);
      return this.validate(parsedData);
    } catch (err) {
      return {
        isValid: false,
        errors: [`Invalid JSON formatting: ${(err as Error).message}`]
      };
    }
  }

  /**
   * Formats Zod validation errors into human-readable messages.
   */
  private static formatZodError(error: ZodError): string[] {
    return error.errors.map(err => {
      const pathStr = err.path.join('.');
      return `[${pathStr || 'root'}]: ${err.message} (${err.code})`;
    });
  }
}
