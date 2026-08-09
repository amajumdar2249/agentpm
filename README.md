# 📦 agentpm

> **The Package Manager for AI Agents.**  
> Securely discover, audit, and install AI skills and system prompts.

[![Build Status](https://img.shields.io/github/actions/workflow/status/amajumdar2249/agentpm/ci.yml?branch=main&style=flat-square)](https://github.com/amajumdar2249/agentpm/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![NPM Version](https://img.shields.io/npm/v/@amajumdar2249/agentpm?style=flat-square)](https://www.npmjs.com/package/@amajumdar2249/agentpm)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg?style=flat-square)](http://www.typescriptlang.org/)

---

## ❌ The Problem
As AI-assisted IDEs (Claude Code, Cursor, Windsurf) take over, developers are manually copy-pasting system prompts, rules, and "skills" from random gists, blogs, and repos. There is **no standard way** to manage, version, or secure your AI's custom instructions. Even worse, blindly copying prompts leads to **Prompt Injection Vulnerabilities**.

## ✅ The Solution
`agentpm` brings the `npm` experience to AI Agents. With a single command, you can install the best open-source AI skills directly into your `.agents/` or `.cursorrules` folders.

Every skill installed via `agentpm` is **automatically audited** for prompt-injection attacks, hidden payloads, and data exfiltration.

```bash
# Install a high-quality React optimization skill securely
$ agentpm install react-best-practices

🚀 Initializing install for skill: react-best-practices
📡 Fetching skill package from agentpm-registry...
🔍 Scanning for prompt injections, jailbreaks & data exfiltration...
✅ Zero-Trust Audit Passed: No malicious prompts found.
📦 Successfully installed react-best-practices into .agents/skills/react-best-practices.md
```

---

## 🚀 Installation & Getting Started

### 1. Install Globally via NPM
```bash
npm install -g @amajumdar2249/agentpm
```

### 2. Available Commands

```bash
# Initialize a new agentic workspace (creates agentpm.json)
agentpm init

# Search for skills in the 44.5k+ registry
agentpm search react

# Securely audit and install a skill
agentpm install react-best-practices

# List all installed skills in current workspace
agentpm list

# Run zero-trust security audit across all local skills
agentpm audit
```

---

## 🛡️ Zero-Trust Security Engine
`agentpm` includes a real built-in AST & Heuristic security scanner that checks for:
- **Prompt Injections:** `ignore previous instructions`, `you are now`, `system: you are`
- **Data Exfiltration:** Hidden HTTP calls attempting to steal `.env` or credentials
- **System Overrides:** Destructive system commands (`rm -rf`, `format c:`, `drop table`)
- **Whitespace Hijacking:** Hidden instructions concealed behind 50+ lines of whitespace

---

## 📄 License
MIT License © 2026 Aurgho Majumdar
