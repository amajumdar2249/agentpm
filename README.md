# 📦 agentpm

> **The Package Manager for AI Agents.**
> Securely discover, audit, and install AI skills and system prompts.

[![Build Status](https://img.shields.io/github/actions/workflow/status/amajumdar2249/agentpm/ci.yml?branch=main&style=flat-square)](https://github.com/amajumdar2249/agentpm/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg?style=flat-square)](http://www.typescriptlang.org/)

## ❌ The Problem
As AI-assisted IDEs (Claude Code, Cursor, Windsurf) take over, developers are manually copy-pasting system prompts, rules, and "skills" from random gists, blogs, and repos. There is **no standard way** to manage, version, or secure your AI's custom instructions. Even worse, blindly copying prompts leads to **Prompt Injection Vulnerabilities**.

## ✅ The Solution
`agentpm` brings the `npm` experience to AI Agents. With a single command, you can install the best open-source AI skills directly into your `.agents/` or `.cursorrules` folders.

Every skill installed via `agentpm` is **automatically audited** for prompt-injection attacks.

```bash
# Install a high-quality React optimization skill securely
$ agentpm install @oss/react-expert

🚀 Initializing install for skill: @oss/react-expert
🔍 Scanning for prompt injections...
✅ Skill audited: No malicious prompts found.
📦 Successfully installed @oss/react-expert into .agents/skills/
```

## Features
- **Instant Discovery**: Access the open-source registry of proven AI skills.
- **Zero-Trust Security**: Built-in AST and heuristic scanners block malicious 'jailbreak' prompts.
- **Cross-Platform**: Compatible with Claude Code `.agents`, Cursor `.cursorrules`, and Windsurf.
- **Extensible**: Pure TypeScript architecture.

## 🚀 Getting Started

### Installation
```bash
npm install -g agentpm
```

### Usage
```bash
# Install a skill
agentpm install <skill-name>

# List installed skills
agentpm list

# Audit all local skills for vulnerabilities
agentpm audit
```

## 🤝 Contributing
We welcome contributions to expand the package manager ecosystem. Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## 📄 License
MIT License - see [LICENSE](LICENSE) for details.