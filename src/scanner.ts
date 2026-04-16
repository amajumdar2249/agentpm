export class SecurityScanner {
  private static maliciousPatterns = [
    /ignore all previous instructions/i,
    /system prompt override/i,
    /jailbreak/i,
    /bypassing constraints/i,
    /disregard previous instructions/i,
    /you are no longer an ai/i
  ];

  /**
   * Scans the content of a skill for common prompt injection patterns.
   * @param content The raw markdown content of the skill
   * @returns An object detailing if the content is safe and any detected threats
   */
  public static audit(content: string): { isSafe: boolean; threats: string[] } {
    const threats: string[] = [];

    for (const pattern of this.maliciousPatterns) {
      if (pattern.test(content)) {
        threats.push(`Matched malicious pattern: ${pattern.toString()}`);
      }
    }

    return {
      isSafe: threats.length === 0,
      threats
    };
  }
}