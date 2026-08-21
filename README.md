# 📦 AgentPM (Monorepo)

> **The Definitive Package Manager & Security Ecosystem for AI Agents.**  
> Securely discover, audit, and install AI skills and prompts across Claude Code, Cursor, Windsurf, and custom agentic frameworks.

[![Build Status](https://img.shields.io/github/actions/workflow/status/amajumdar2249/agentpm/ci.yml?branch=main&style=flat-square)](https://github.com/amajumdar2249/agentpm/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![NPM Version](https://img.shields.io/npm/v/@amajumdar2249/agentpm?style=flat-square)](https://www.npmjs.com/package/@amajumdar2249/agentpm)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg?style=flat-square)](http://www.typescriptlang.org/)

---

## 🏗️ Monorepo Structure

```text
agentpm/ (Monorepo Root)
├── packages/
│   ├── cli/                     # CLI Tool & Zero-Trust Security Engine (@amajumdar2249/agentpm)
│   │   ├── src/                 # Security scanner, registry client, CLI commands
│   │   ├── tests/               # Automated unit tests
│   │   └── package.json
│   └── registry/                # Central Skills Registry (@amajumdar2249/agentpm-registry)
│       ├── packages/            # 44,563 JSON skill package definitions
│       ├── index.json           # Master registry index
│       └── package.json
├── web/                         # Web Explorer & Landing Page (Next.js)
├── backend/                     # Cloudflare Workers & D1 Database API
├── package.json                 # Monorepo Root (NPM Workspaces)
└── README.md                    # Unified Documentation
```

---

## 🚀 Installation & Quick Start

### Install Globally via NPM
```bash
npm install -g @amajumdar2249/agentpm
```

### Available CLI Commands
```bash
# Initialize AgentPM workspace (creates agentpm.json and .agents/skills/)
agentpm init

# Search for AI skills from the 44,500+ registry
agentpm search react

# Download, security-scan, and install an AI skill
agentpm install react-best-practices

# List all installed skills in current workspace
agentpm list

# Run zero-trust security audit on local prompts for prompt injections
agentpm audit
```

---

## 💻 Monorepo Development Commands

```bash
# Clone the repository
git clone https://github.com/amajumdar2249/agentpm.git
cd agentpm

# Install dependencies across all workspaces
npm install

# Build all packages
npm run build

# Run local CLI engine from root
npm start -- --help
npm start -- search react
npm start -- audit

# Run unit tests
npm test
```

---

## 🛡️ Zero-Trust Security Engine
`agentpm` includes an AST & Heuristic security scanner that protects against:
- **Prompt Injections & Jailbreaks:** `ignore previous instructions`, `system: you are`
- **Data Exfiltration:** Hidden HTTP calls attempting to steal `.env` or API credentials
- **System Overrides:** Destructive system commands (`rm -rf`, `format c:`)
- **Whitespace Hijacking:** Concealed malicious prompts hidden behind 50+ lines of whitespace

---

## 📄 License
MIT License © 2026 Aurgho Majumdar
