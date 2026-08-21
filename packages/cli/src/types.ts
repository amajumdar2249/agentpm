// ============================================================
// AgentPM — Core Type Definitions
// ============================================================

export enum Severity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  INFO = 'INFO',
}

export interface ScanFinding {
  severity: Severity;
  title: string;
  description: string;
  filePath: string;
  line?: number;
  evidence?: string;
  remediation: string;
}

export interface ScanSummary {
  totalFiles: number;
  totalFindings: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  findings: ScanFinding[];
}

export interface AgentPmManifest {
  name: string;
  version: string;
  description?: string;
  author?: string;
  skills: Record<string, string>; // name -> version
}

export interface RegistrySkillMeta {
  name: string;
  version: string;
  description: string;
  author?: string;
  tags?: string[];
  sha256?: string;
  downloadUrl?: string;
  content?: string;
}
