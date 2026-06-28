# 🌌 AgentPM 

<div align="center">
  <h3><b>The Definitive Package Manager for Autonomous AI Environments</b></h3>
  <p>Securely discover, audit, and orchestrate AI skills, system prompts, and toolsets.</p>
</div>

---

[![npm version](https://img.shields.io/npm/v/agentpm?style=for-the-badge&color=8A2BE2)](https://www.npmjs.com/package/agentpm)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge&color=00C853)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg?style=for-the-badge)](http://www.typescriptlang.org/)
[![Security: Sentinel](https://img.shields.io/badge/Security-Zero%20Trust-red?style=for-the-badge)](https://github.com/amajumdar2249/agentpm)
[![Registry](https://img.shields.io/badge/Registry-19%2C854%20Skills-blueviolet?style=for-the-badge)](https://github.com/amajumdar2249/agentpm-registry)

## ❌ The Dark Age of Exchanging Prompts
As AI-assisted engineering (via Claude Code, Cursor, Windsurf) accelerates, developers are reduced to manually copy-pasting system prompts, rules, and "skills" from fragmented gists and unprotected repositories. 

There is **no standard architecture** to manage, version, or secure custom AI instructions. Even worse, blindly copying third-party prompts introduces catastrophic **Prompt Injection Vulnerabilities** into your agentic workspace.

## 🌟 The Vanguard: AgentPM
`AgentPM` brings the robust `npm` and `cargo` experience directly to AI Agents. It transforms scattered text files into a scalable, secure, and standardized ecosystem.

Every skill installed via `AgentPM` passes through a **Zero-Trust Security Sandbox**, automatically audited for malicious payloads and prompt-injection attacks before they touch your environment.

```bash
# 1. Initialize an AI-ready workspace
$ agentpm init

# 2. Securely install high-quality audited skills
$ agentpm install @oss/react-expert

🚀 Initializing install for skill: @oss/react-expert
🔍 Scanning deep abstraction layers for prompt injections...
✅ Skill audited: 0 malicious signatures found.
📦 Successfully deployed @oss/react-expert into .agents/skills/
```

## ✨ Features

| Feature | Description |
|---------|-------------|
| ⚡ **Instant Discovery** | Search 19,854+ production-grade AI skills from the [AgentPM Registry](https://github.com/amajumdar2249/agentpm-registry) |
| 🛡️ **Zero-Trust Security** | AST and heuristic engines block hidden jailbreaks and data exfiltration attempts |
| 🏗️ **Agentic Workspaces** | `agentpm init` scaffolds `.agents` environments with structural integrity |
| 🔍 **Security Auditor** | `agentpm audit` scans skill files for prompt injection and destructive commands |
| 🤖 **AI Skill Generator** | `agentpm generate` creates new skills using offline templates or Gemini |
| 📦 **Publish & Share** | `agentpm publish` contributes skills to the global registry |
| 🖥️ **MCP Server** | `agentpm mcp` exposes tools via Model Context Protocol for AI agent integration |
| 🌐 **Platform Agnostic** | Works with Claude Code (`.agents`), Cursor (`.cursorrules`), and Windsurf |

## 🚀 Quick Start

### Installation
```bash
npm install -g agentpm
```

### Command Palette

```bash
# Scaffold an optimized agentic workspace
agentpm init

# Search the global registry (19,854+ skills)
agentpm search "react security"

# Securely install and audit a remote skill
agentpm install <skill-name>

# Audit a skill file for security threats
agentpm audit ./path/to/skill

# Generate a new skill from a prompt
agentpm generate my-skill "Build a REST API validator"

# View your orchestrated local environment
agentpm list

# Publish a skill to the registry
agentpm publish ./my-skill/

# Start the MCP server for AI agent integration
agentpm mcp
```

## 🏛️ Architecture

```
agentpm/
├── src/
│   ├── index.ts              # CLI entry point (Commander.js)
│   ├── scanner.ts            # 23+ regex patterns for prompt injection detection
│   ├── installer.ts          # Local-first, remote-fallback skill fetcher
│   ├── search.ts             # MiniSearch-powered fuzzy search engine
│   ├── schema.ts             # Zod-validated skill metadata schema
│   ├── mcp.ts                # Model Context Protocol server (4 tools)
│   └── commands/             # 10 CLI command handlers
├── registry/                 # Embedded registry (git submodule → agentpm-registry)
├── tests/                    # Jest test suite (8 test files)
└── web/                      # Next.js 16 registry browser (React 19)
```

## 🔗 Ecosystem

| Repository | Purpose |
|------------|---------|
| [agentpm](https://github.com/amajumdar2249/agentpm) | CLI tool & MCP server (this repo) |
| [agentpm-registry](https://github.com/amajumdar2249/agentpm-registry) | Global skill registry (19,854+ skills) |
| [devarmor](https://www.npmjs.com/package/devarmor) | AI workstation security scanner ([npm](https://www.npmjs.com/package/devarmor)) |

## 🤝 Contributing
We welcome contributions to expand the AgentPM ecosystem. See [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

## 🔒 Security
See [SECURITY.md](SECURITY.md) for our security policy and vulnerability reporting.

## 📄 License
MIT License — See [LICENSE](LICENSE) for details.
