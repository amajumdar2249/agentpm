# 📦 AgentPM

> **The Package Manager & Zero-Trust Security Scanner for AI Agent Skills.**  
> Securely discover, audit, and install AI prompts & skills across Claude Code, Cursor, Windsurf, and custom autonomous agents.

[![Build Status](https://img.shields.io/github/actions/workflow/status/amajumdar2249/agentpm/ci.yml?branch=main&style=flat-square)](https://github.com/amajumdar2249/agentpm/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![NPM Version](https://img.shields.io/npm/v/@amajumdar2249/agentpm?style=flat-square)](https://www.npmjs.com/package/@amajumdar2249/agentpm)
[![Indexed Skills](https://img.shields.io/badge/skills%20indexed-44%2C563-brightgreen?style=flat-square)](https://github.com/amajumdar2249/agentpm-registry)

---

## ⚡ 10-Second Quickstart (Zero Installation Required!)

You can run AgentPM instantly using `npx` without installing anything or configuring permissions:

```bash
# Search 44,500+ skills directly from your terminal
npx @amajumdar2249/agentpm search react

# Audit your current project skills for prompt injections & secret leaks
npx @amajumdar2249/agentpm audit
```

---

## 📦 Global Installation (For Daily Use)

If you use AgentPM frequently, install it globally for instant command execution:

```bash
npm install -g @amajumdar2249/agentpm
```

*(Windows PowerShell note: If script execution is restricted on your system, run `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force` once, or simply use `npx @amajumdar2249/agentpm`.)*

---

## 🛠️ Commands & What They Do

| Command | What It Does | Example |
| :--- | :--- | :--- |
| **`agentpm search <query>`** | Searches 44,563 community & curated agent skills with fuzzy matching | `agentpm search kubernetes` |
| **`agentpm install <skill>`** | Downloads skill, runs Zero-Trust security scan, and places it into `.agents/skills/` | `agentpm install 12-factor-app` |
| **`agentpm audit`** | Scans all workspace skills for prompt injections, malicious overrides, and data exfiltration | `agentpm audit` |
| **`agentpm init`** | Initializes a new workspace with `agentpm.json` manifest and `.agents/skills/` folder | `agentpm init` |
| **`agentpm list`** | Displays all installed skills and version pins in the current workspace | `agentpm list` |
| **`agentpm --version`** | Displays current AgentPM version | `agentpm --version` |

---

## 🛡️ Why AgentPM? (Zero-Trust Prompt Security)

AI agents (Claude Code, Cursor, Windsurf) have file and terminal execution access. Copy-pasting unverified markdown prompts or community skills opens your machine to prompt injections and data leaks.

AgentPM's built-in **AST & Heuristic Scanner (`agentpm audit`)** automatically intercepts:
1. **Prompt Injections & Jailbreaks:** Hidden triggers like `ignore previous instructions`, `you are now`, `system: you are`.
2. **Data Exfiltration Vectors:** Obfuscated HTTP commands (`curl/wget`) attempting to read or upload `.env` or credentials.
3. **Destructive Shell Commands:** Dangerous scripts like `rm -rf`, disk wipes, or unauthorized process spawning.
4. **Whitespace Hiding Attacks:** Concealed malicious prompts hidden after 50+ blank lines.

---

## 🏗️ Architecture & Workspaces

AgentPM is structured as a high-performance TypeScript monorepo:

```text
agentpm/
├── packages/
│   ├── cli/                     # CLI Tool & Security Scanner (@amajumdar2249/agentpm)
│   └── registry/                # Central Skills Registry (44,563 JSON packages)
├── web/                         # Web Skills Explorer (Next.js)
├── backend/                     # Cloudflare Workers API
└── package.json                 # Monorepo Workspaces Root
```

---

## 📄 License

MIT License © 2026 Aurgho Majumdar
