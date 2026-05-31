export class SecurityScanner {
  private static maliciousPatterns = [
    // 1. Classic Prompt Injection & System Override
    {
      pattern: /ignore all previous instructions/i,
      category: "System Prompt Override",
      description: "Attempts to wipe the AI's core instructions."
    },
    {
      pattern: /disregard (all )?previous instructions/i,
      category: "System Prompt Override",
      description: "Attempts to cancel active constraints."
    },
    {
      pattern: /system prompt override/i,
      category: "System Prompt Override",
      description: "Explicit attempt to inject new core directions."
    },
    {
      pattern: /you are no longer an ai/i,
      category: "Persona Hijacking",
      description: "Bypasses default assistant behaviors."
    },
    {
      pattern: /jailbreak/i,
      category: "Safety Bypass",
      description: "Common indicator of safety circumvention."
    },

    // 2. Execution Hijacking (Targeting Coding Assistants)
    {
      pattern: /run command (silently|without asking)/i,
      category: "Execution Hijacking",
      description: "Directs AI to bypass user terminal approvals."
    },
    {
      pattern: /execute (arbitrary )?shell commands/i,
      category: "Execution Hijacking",
      description: "Directs AI to execute terminal script injection."
    },
    {
      pattern: /rm -rf (.*?)/i,
      category: "Destructive Command",
      description: "Attempts to delete filesystem folders."
    },
    {
      pattern: /format c:/i,
      category: "Destructive Command",
      description: "Attempts disk initialization commands."
    },

    // 3. Exfiltration Threats
    {
      pattern: /exfiltrate (.*?)/i,
      category: "Data Exfiltration",
      description: "Explicit directions to steal local files/keys."
    },
    {
      pattern: /curl (.*?) -d (.*?)/i,
      category: "Data Exfiltration",
      description: "HTTP POST commands configured to upload local contents."
    },
    {
      pattern: /send (keys|secrets|\.env) to/i,
      category: "Data Exfiltration",
      description: "Directs AI to upload configuration secrets."
    }
  ];

  /**
   * Scans the content of a skill for prompt injection and security threats.
   * @param content The raw markdown content of the skill
   * @returns An object detailing if the content is safe and any detected threats
   */
  public static audit(content: string): { isSafe: boolean; threats: string[] } {
    const threats: string[] = [];

    for (const rule of this.maliciousPatterns) {
      if (rule.pattern.test(content)) {
        threats.push(`[${rule.category}] Matched: "${rule.pattern.source}" - ${rule.description}`);
      }
    }

    return {
      isSafe: threats.length === 0,
      threats
    };
  }
}
