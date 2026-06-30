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
      pattern: /ignore the system (prompt|guidelines|rules)/i,
      category: "System Prompt Override",
      description: "Explicit attempt to bypass system prompt constraints."
    },
    {
      pattern: /developer mode/i,
      category: "System Prompt Override",
      description: "Attempts to switch the model into an unconstrained developer/jailbreak mode."
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
    {
      pattern: /bypass (security|formatting|linting) rules/i,
      category: "Safety Bypass",
      description: "Attempts to deactivate platform safety constraints."
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
      pattern: /execute silently/i,
      category: "Execution Hijacking",
      description: "Bypasses human-in-the-loop review."
    },
    {
      pattern: /auto approve all commands/i,
      category: "Execution Hijacking",
      description: "Forcibly bypasses user verification checkpoints."
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
    {
      pattern: /rmdir\s+\/s\s+\/q/i,
      category: "Destructive Command",
      description: "Attempts to silently delete folders in Windows."
    },
    {
      pattern: /del\s+\/s\s+\/q/i,
      category: "Destructive Command",
      description: "Attempts to silently delete files in Windows."
    },
    {
      pattern: /shred\s+-/i,
      category: "Destructive Command",
      description: "Attempts file shredding command execution."
    },

    // 3. Exfiltration Threats
    {
      pattern: /exfiltrate (.*?)/i,
      category: "Data Exfiltration",
      description: "Explicit directions to steal local files/keys."
    },
    {
      pattern: /curl\s+.*?(\s+-d|\s+--data|\s+--data-raw|\s+--data-binary)\b/i,
      category: "Data Exfiltration",
      description: "HTTP POST commands configured to upload local contents."
    },
    {
      pattern: /wget\s+.*?\s+--post-data/i,
      category: "Data Exfiltration",
      description: "HTTP POST via wget configured to upload local contents."
    },
    {
      pattern: /fetch\(['"]https?:\/\//i,
      category: "Data Exfiltration",
      description: "Javascript fetch calls targeting remote servers."
    },
    {
      pattern: /axios\.post\(['"]https?:\/\//i,
      category: "Data Exfiltration",
      description: "Javascript axios post calls targeting remote servers."
    },
    {
      pattern: /cat ~\/\.ssh\//i,
      category: "Data Exfiltration",
      description: "Attempts to read SSH keys for exfiltration."
    },
    {
      pattern: /cat ~\/\.aws\//i,
      category: "Data Exfiltration",
      description: "Attempts to read AWS credentials for exfiltration."
    },
    {
      pattern: /cat ~\/\.kube\//i,
      category: "Data Exfiltration",
      description: "Attempts to read Kubernetes config files."
    },
    {
      pattern: /send (keys|secrets|\.env) to/i,
      category: "Data Exfiltration",
      description: "Directs AI to upload configuration secrets."
    },

    // 4. Repository Hijacking
    {
      pattern: /git\s+push\s+.*?(-f|--force)\b/i,
      category: "Repository Hijacking",
      description: "Force pushes to repository which can wipe remote commit history."
    },
    {
      pattern: /npm\s+publish\s+.*?(-f|--force)\b/i,
      category: "Repository Hijacking",
      description: "Unauthorized forced package publishing."
    }
  ];

  /**
   * Scans the content of a skill for prompt injection and security threats.
   * @param content The raw markdown content of the skill
   * @returns An object detailing if the content is safe and any detected threats
   */
  public static audit(content: string): { isSafe: boolean; threats: string[] } {
    const threats: string[] = [];

    // Normalize to defeat unicode bypass attacks:
    // "Ignore" -> "Ignore" | "rgnore" -> "ignore" | "i g n o r e" -> "ignore"
    const normalized = content
      .replace(/[\u00AD\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g, '') // strip zero-width chars
      .normalize('NFKD')            // decompose unicode lookalikes
      .replace(/[\p{M}]/gu, '')     // strip combining marks
      .replace(/\s+/g, ' ');        // collapse whitespace

    for (const rule of this.maliciousPatterns) {
      if (rule.pattern.test(normalized)) {
        threats.push(`[${rule.category}] Matched: "${rule.pattern.source}" - ${rule.description}`);
      }
    }

    return {
      isSafe: threats.length === 0,
      threats
    };
  }
}
