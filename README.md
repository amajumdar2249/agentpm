# 🌌 AgentPM 

<div align="center">
  <h3><b>The Definitive Package Manager for Autonomous AI Environments</b></h3>
  <p>Securely discover, audit, and orchestrate AI skills, system prompts, and toolsets.</p>
</div>

---

[![Build Status](https://img.shields.io/github/actions/workflow/status/amaju/agentpm/ci.yml?branch=main&style=for-the-badge&color=8A2BE2)](https://github.com/amaju/agentpm/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge&color=00C853)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg?style=for-the-badge)](http://www.typescriptlang.org/)
[![Security: Sentinel](https://img.shields.io/badge/Security-Zero%20Trust-red?style=for-the-badge)](https://github.com/amaju/agentpm)

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

## ✨ Extraordinary Features

- ⚡ **Instant Discovery**: Tap into the ultimate global registry of proven, production-grade AI skills and personas.
- 🛡️ **Zero-Trust Security**: Proprietary AST and heuristic engines block hidden 'jailbreaks' and 'data exfiltration' attempts embedded into prompts.
- 🏗️ **Agentic Workspaces (`agentpm init`)**: Instantly scaffold advanced `.agents` environments with structural integrity.
- 🌐 **Platform Agnostic**: Flawlessly integrates with Claude Code (`.agents`), Cursor (`.cursorrules`), and Windsurf.
- 💎 **Pure TypeScript**: Lightning fast execution with strict type guarantees across the entire lifecycle.

## 🚀 Quick Start

### Installation
```bash
npm install -g agentpm
```

### Command Palette

```bash
# Scaffold an optimized agentic workspace
agentpm init

# Securely install and audit a remote skill
agentpm install <skill-name>

# View your orchestrated local environment
agentpm list
```

## 🤝 Establish the Future
We welcome extraordinary minds to expand the Neural Registry ecosystem. See [CONTRIBUTING.md](CONTRIBUTING.md) to shape the future of AI package management.

## 📄 License
MIT License - Developed with unparalleled focus. See [LICENSE](LICENSE) for details.
