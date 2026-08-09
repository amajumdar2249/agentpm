// ============================================================
// AgentPM — Zero-Trust Security Scanner Engine
// Scans AI skills, prompts, and .cursorrules for prompt injections,
// data exfiltration, system destruction, and hidden payloads.
// ============================================================

import * as fs from 'fs';
import * as path from 'path';
import { Severity, ScanFinding, ScanSummary } from './types';

/** Prompt injection patterns targeting AI system instructions. */
export const PROMPT_INJECTION_PATTERNS: { regex: RegExp; label: string }[] = [
  { regex: /ignore\s+previous\s+instructions/gi, label: 'Ignore previous instructions' },
  { regex: /ignore\s+all\s+prior/gi, label: 'Ignore all prior instructions' },
  { regex: /you\s+are\s+now/gi, label: 'Identity override (you are now)' },
  { regex: /override\s+your/gi, label: 'Override directive' },
  { regex: /disregard\s+your/gi, label: 'Disregard directive' },
  { regex: /forget\s+(everything|all|your)/gi, label: 'Memory wipe directive' },
  { regex: /new\s+instructions?\s*:/gi, label: 'New instructions injection' },
  { regex: /system\s*:\s*you\s+are/gi, label: 'System prompt override' },
];

/** Data exfiltration patterns designed to leak environment secrets. */
export const DATA_EXFIL_PATTERNS: { regex: RegExp; label: string }[] = [
  { regex: /fetch\s*\(\s*['"][^'"]*['"].*(?:file|content|secret|key|token|password)/gi, label: 'Fetch with sensitive data' },
  { regex: /https?:\/\/[^\s'"]+.*(?:readFile|readFileSync|file_contents)/gi, label: 'HTTP request with file contents' },
  { regex: /upload.*(?:credentials|secrets|keys|tokens|\.env)/gi, label: 'Upload credentials' },
  { regex: /(?:curl|wget|fetch|http\.post)\s*.*(?:\.env|credentials|secrets)/gi, label: 'HTTP exfiltration of secrets' },
  { regex: /base64.*(?:send|post|fetch|curl)/gi, label: 'Base64 encode and send' },
];

/** Destructive system commands. */
export const SYSTEM_OVERRIDE_PATTERNS: { regex: RegExp; label: string }[] = [
  { regex: /\brm\s+-rf\b/g, label: 'Recursive delete (rm -rf)' },
  { regex: /\bformat\s+c:/gi, label: 'Format drive (format c:)' },
  { regex: /\bdrop\s+(?:table|database)\b/gi, label: 'SQL drop command' },
  { regex: /\bshutdown\b.*(?:\/s|now|-h)/gi, label: 'System shutdown' },
  { regex: /\bkill\s+-9\b/g, label: 'Force kill process' },
];

/**
 * Detects hidden instructions after large blocks of whitespace (50+ blank lines).
 */
export function checkWhitespaceHiding(content: string, filePath: string = 'skill'): ScanFinding[] {
  const findings: ScanFinding[] = [];
  const largeWhitespace = /\n{50,}/g;
  let match: RegExpExecArray | null;

  while ((match = largeWhitespace.exec(content)) !== null) {
    const after = content.substring(match.index + match[0].length).trim();
    if (after.length > 0) {
      const upToMatch = content.substring(0, match.index);
      const lineNumber = upToMatch.split('\n').length;

      findings.push({
        severity: Severity.HIGH,
        title: 'Hidden Instructions After Whitespace',
        description: 'Found content hidden after a large block of whitespace — classic prompt injection vector.',
        filePath,
        line: lineNumber,
        remediation: 'Remove hidden payload or consolidate whitespace in this skill file.',
      });
    }
  }

  return findings;
}

/**
 * Scans a single skill's text content for security vulnerabilities.
 */
export function scanContent(content: string, filePath: string = 'skill'): ScanFinding[] {
  const findings: ScanFinding[] = [];

  // 1. Prompt Injection Checks
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    pattern.regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.regex.exec(content)) !== null) {
      const upToMatch = content.substring(0, match.index);
      const lineNumber = upToMatch.split('\n').length;

      findings.push({
        severity: Severity.CRITICAL,
        title: `Prompt Injection — ${pattern.label}`,
        description: 'Detected prompt injection attempt trying to override base AI directives.',
        filePath,
        line: lineNumber,
        evidence: match[0],
        remediation: 'Quarantine or remove this prompt instruction immediately.',
      });
    }
  }

  // 2. Data Exfiltration Checks
  for (const pattern of DATA_EXFIL_PATTERNS) {
    pattern.regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.regex.exec(content)) !== null) {
      const upToMatch = content.substring(0, match.index);
      const lineNumber = upToMatch.split('\n').length;

      findings.push({
        severity: Severity.CRITICAL,
        title: `Data Exfiltration Risk — ${pattern.label}`,
        description: 'Detected attempt to exfiltrate files or secrets to an external server.',
        filePath,
        line: lineNumber,
        evidence: match[0],
        remediation: 'Block this skill from execution to prevent credentials leakage.',
      });
    }
  }

  // 3. Destructive Command Checks
  for (const pattern of SYSTEM_OVERRIDE_PATTERNS) {
    pattern.regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.regex.exec(content)) !== null) {
      const upToMatch = content.substring(0, match.index);
      const lineNumber = upToMatch.split('\n').length;

      findings.push({
        severity: Severity.HIGH,
        title: `Destructive System Command — ${pattern.label}`,
        description: 'Contains dangerous system shell or database destruction command.',
        filePath,
        line: lineNumber,
        evidence: match[0],
        remediation: 'Review and remove destructive commands from skill prompt.',
      });
    }
  }

  // 4. Whitespace Hiding Check
  findings.push(...checkWhitespaceHiding(content, filePath));

  return findings;
}

/**
 * Recursively scans all skill files in a project workspace.
 */
export function scanWorkspace(workspacePath: string): ScanSummary {
  const targetDirs = [
    path.join(workspacePath, '.agents', 'skills'),
    path.join(workspacePath, '.cursor', 'rules'),
    path.join(workspacePath, '.windsurf', 'rules'),
  ];

  let totalFiles = 0;
  const allFindings: ScanFinding[] = [];

  for (const dir of targetDirs) {
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir, { recursive: true }) as string[];
    for (const file of files) {
      const fullPath = path.join(dir, file.toString());
      if (fs.statSync(fullPath).isFile() && (fullPath.endsWith('.md') || fullPath.endsWith('.txt') || fullPath.endsWith('.json'))) {
        totalFiles++;
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const fileFindings = scanContent(content, fullPath);
          allFindings.push(...fileFindings);
        } catch {
          // Ignore unreadable files
        }
      }
    }
  }

  return {
    totalFiles,
    totalFindings: allFindings.length,
    critical: allFindings.filter((f) => f.severity === Severity.CRITICAL).length,
    high: allFindings.filter((f) => f.severity === Severity.HIGH).length,
    medium: allFindings.filter((f) => f.severity === Severity.MEDIUM).length,
    low: allFindings.filter((f) => f.severity === Severity.LOW).length,
    info: allFindings.filter((f) => f.severity === Severity.INFO).length,
    findings: allFindings,
  };
}

/**
 * SecurityScanner Class for command handlers and MCP integration.
 */
export class SecurityScanner {
  public static audit(content: string): { isSafe: boolean; threats: string[]; findings: ScanFinding[] } {
    const findings = scanContent(content);
    const threats = findings.map(f => `[${f.severity}] ${f.title}`);
    return {
      isSafe: findings.length === 0,
      threats,
      findings
    };
  }

  public static scan(targetPath: string): ScanSummary {
    if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
      return scanWorkspace(targetPath);
    }
    const content = fs.readFileSync(targetPath, 'utf-8');
    const findings = scanContent(content, targetPath);
    return {
      totalFiles: 1,
      totalFindings: findings.length,
      critical: findings.filter(f => f.severity === Severity.CRITICAL).length,
      high: findings.filter(f => f.severity === Severity.HIGH).length,
      medium: findings.filter(f => f.severity === Severity.MEDIUM).length,
      low: findings.filter(f => f.severity === Severity.LOW).length,
      info: findings.filter(f => f.severity === Severity.INFO).length,
      findings
    };
  }
}
