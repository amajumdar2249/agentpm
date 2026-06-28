# AgentPM MCP Server - Setup Guide

AgentPM includes a built-in MCP (Model Context Protocol) server that lets Claude Code and Cursor securely find, audit, and run AI agent skills.

## Setup for Claude Code

**Step 1:** Find your Claude config file:
- macOS/Linux: `~/.claude.json`
- Windows: `C:\Users\<username>\.claude.json`

**Step 2:** Add AgentPM as an MCP server:
```json
{
  "mcpServers": {
    "agentpm": {
      "command": "agentpm",
      "args": ["mcp"],
      "description": "AgentPM skill registry and installer"
    }
  }
}
```

**Step 3:** Restart Claude Code.

**Step 4:** Test it by saying to Claude:
> "Search AgentPM for a React expert skill"
> "Install the code-review skill via AgentPM"
> "Audit this prompt for security issues"

## Setup for Cursor

Add to your `.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "agentpm": {
      "command": "agentpm",
      "args": ["mcp"]
    }
  }
}
```

## Available MCP Tools

| Tool | Description | Example |
| --- | --- | --- |
| `search_skills` | Search the registry | "Find me a SQL expert skill" |
| `install_skill` | Install a skill | "Install react-expert" |
| `audit_prompt` | Scan for injections | "Is this prompt safe?" |

## Troubleshooting

**"agentpm: command not found"**
-> Install globally: `npm install -g agentpm`

**"No results from search_skills"**
-> Local registry missing. Run: `agentpm install react-expert` to test remote fallback.
