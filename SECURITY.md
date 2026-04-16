# Security Policy

## Supported Versions

Currently, `agentpm` supports the following versions with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0.0 | :x:                |

## Core Security Stance

Since `agentpm` interfaces with system prompts and local AI settings (`.agents`, `.cursorrules`), security is the foundational pillar of this tool. We explicitly check for:
1. **Prompt Injection Attacks**: Instructions embedded in skills that aim to override the user's primary AI guardrails.
2. **Exfiltration Attempts**: Malicious skills designed to trick local AI into writing sensitive machine data to public endpoints.
3. **Malicious File Execution**: Payloads aiming to mask executable attacks within `.md` files.

## Reporting a Vulnerability

If you discover a vulnerability or a bypass in our prompt-scanner heuristics, please do **NOT** open a public issue.

Instead, please email security@agentpm.example.com. We will acknowledge receipt of your vulnerability report within 48 hours and strive to send you regular updates about our progress.

## Bug Bounties
We are currently setting up a bug-bounty program. At this time, we do not provide monetary compensation, but we will ensure you get top-tier recognition in our GitHub Wall of Fame and Release Notes.