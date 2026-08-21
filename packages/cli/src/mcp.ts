import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ErrorCode,
  McpError
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs";
import path from "path";
import { SecurityScanner } from "./scanner";
import { SkillInstaller } from "./installer";
import { SkillSearcher } from "./search";
import { handleRun } from "./commands/run";
import { defaultContext } from "./core/factory";
import { toSlug } from "./utils/slug";

export const server = new Server(
  {
    name: "agentpm-server",
    version: "1.1.0"
  },
  {
    capabilities: {
      resources: {},
      tools: {}
    }
  }
);

const indexPath = path.join(__dirname, "..", "registry", "index.json");

// ============================================================================
// 1. Expose Tools
// ============================================================================
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "search_skills",
        description: "Search the AgentPM registry index for available AI skills and prompt playbooks by query keyword instantly.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query keyword (e.g., 'react', 'seo', 'django')"
            }
          },
          required: ["query"]
        }
      },
      {
        name: "install_skill",
        description: "Scans and installs an AI skill playbook from the registry directly into the workspace's .agents/skills directory.",
        inputSchema: {
          type: "object",
          properties: {
            skillName: {
              type: "string",
              description: "Name or slug of the skill to install (e.g., 'blog-write', 'python-refactor')"
            }
          },
          required: ["skillName"]
        }
      },
      {
        name: "run_skill",
        description: "Executes script blocks or renders playbook instructions for an installed skill.",
        inputSchema: {
          type: "object",
          properties: {
            skillName: {
              type: "string",
              description: "Name or slug of the skill to run."
            }
          },
          required: ["skillName"]
        }
      },
      {
        name: "audit_prompt",
        description: "Scans a raw prompt string for injection vulnerabilities, system prompt overrides, or destructive commands.",
        inputSchema: {
          type: "object",
          properties: {
            promptText: {
              type: "string",
              description: "Raw prompt text to scan/audit"
            }
          },
          required: ["promptText"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "search_skills": {
        const query = String(args?.query || "").trim().toLowerCase();
        if (!fs.existsSync(indexPath)) {
          return {
            content: [{ type: "text", text: "⚠️ Registry index not compiled locally." }],
            isError: true
          };
        }
        
        const cachePath = path.join(path.dirname(indexPath), 'index.search.json');
        let forceRebuild = false;

        if (fs.existsSync(cachePath)) {
          const indexStat = fs.statSync(indexPath);
          const cacheStat = fs.statSync(cachePath);
          if (indexStat.mtime > cacheStat.mtime) {
            forceRebuild = true;
          }
        } else {
          forceRebuild = true;
        }

        let index: any[] = [];
        try {
          const raw = fs.readFileSync(indexPath, "utf8");
          index = JSON.parse(raw);
        } catch {
          index = [];
        }
        
        const searcher = new SkillSearcher();
        searcher.loadOrBuildIndex(index, cachePath, forceRebuild, fs);
        const matches = searcher.search(query);

        const results = matches.slice(0, 5).map((pkg: any) => 
          `📦 Name: ${pkg.name} (slug: ${pkg.slug})\n   Description: ${pkg.description}`
        ).join("\n\n");

        return {
          content: [
            {
              type: "text",
              text: matches.length === 0 
                ? `No skills found matching: "${query}"`
                : `🔎 Found ${matches.length} matches (showing top 5):\n\n${results}`
            }
          ]
        };
      }

      case "install_skill": {
        const skillName = String(args?.skillName || "").trim().slice(0, 100);
        
        let content: string;
        let version: string;
        try {
          const result = await SkillInstaller.fetchRemoteSkill(skillName);
          content = result.content;
          version = result.version;
        } catch (err) {
          return {
            content: [{ type: "text", text: `❌ Fetch failed: ${(err as Error).message}` }],
            isError: true
          };
        }

        const auditResult = SecurityScanner.audit(content);
        if (!auditResult.isSafe) {
          return {
            content: [
              {
                type: "text",
                text: `❌ Security Audit FAILED! Prompt injection threat detected:\n` +
                      auditResult.threats.map(t => `  - ${t}`).join("\n") +
                      `\nInstallation aborted.`
              }
            ],
            isError: true
          };
        }

        const savePath = SkillInstaller.saveSkillLocal(skillName, content, version);
        return {
          content: [
            {
              type: "text",
              text: `✅ Skill '${skillName}' successfully installed!\nSaved at: ${savePath}`
            }
          ]
        };
      }

      case "run_skill": {
        const skillName = String(args?.skillName || "").trim().slice(0, 100);
        
        // Setup capture buffers for logs/errors to return over MCP response
        const logs: string[] = [];
        const errors: string[] = [];
        const mcpContext = {
          ...defaultContext,
          io: {
            log: (msg: string) => logs.push(msg),
            error: (msg: string) => errors.push(msg),
            write: (msg: string) => logs.push(msg)
          }
        };

        await handleRun(mcpContext, skillName);

        return {
          content: [
            {
              type: "text",
              text: `🚀 Skill execution result:\n\n` + 
                    (logs.length > 0 ? `Output:\n${logs.join('\n')}\n` : '') +
                    (errors.length > 0 ? `Errors:\n${errors.join('\n')}` : '')
            }
          ]
        };
      }

      case "audit_prompt": {
        const promptText = String(args?.promptText || "").slice(0, 524288); // 512KB cap
        const result = SecurityScanner.audit(promptText);
        
        return {
          content: [
            {
              type: "text",
              text: result.isSafe 
                ? "✅ Prompt is safe. No malicious injection patterns found."
                : `⚠️ Threats detected:\n` + result.threats.map(t => `  - ${t}`).join("\n")
            }
          ]
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (err) {
    return {
      content: [{ type: "text", text: `Error executing tool: ${(err as Error).message}` }],
      isError: true
    };
  }
});

// ============================================================================
// 2. Expose Resources
// ============================================================================
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const configPath = path.join(process.cwd(), "agentpm.json");
  const resources = [];

  if (fs.existsSync(configPath)) {
    resources.push({
      uri: "agentpm://skills/installed",
      name: "Installed Agent Skills",
      mimeType: "application/json",
      description: "JSON list of all active AI skills configured in this workspace's agentpm.json."
    });
  }

  return { resources };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;

  if (uri === "agentpm://skills/installed") {
    const configPath = path.join(process.cwd(), "agentpm.json");
    if (!fs.existsSync(configPath)) {
      throw new McpError(ErrorCode.InvalidRequest, "No active workspace. Run agentpm init first.");
    }
    const raw = fs.readFileSync(configPath, "utf8");
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: raw
        }
      ]
    };
  }

  const match = uri.match(/^agentpm:\/\/skills\/content\/(.+)$/);
  if (match) {
    const slug = toSlug(match[1]);
    const skillPath = path.join(process.cwd(), ".agents", "skills", `${slug}.md`);
    
    if (!fs.existsSync(skillPath)) {
      throw new McpError(ErrorCode.InvalidRequest, `Skill file not found at: ${skillPath}`);
    }
    
    const content = fs.readFileSync(skillPath, "utf8");
    return {
      contents: [
        {
          uri,
          mimeType: "text/markdown",
          text: content
        }
      ]
    };
  }

  throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
});

// ============================================================================
// 3. Start MCP Server Transport
// ============================================================================
export async function startMcpServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("AgentPM MCP Server successfully connected over stdio.");

  process.on('SIGTERM', async () => {
    await transport.close();
    process.exit(0);
  });
  process.on('SIGINT', async () => {
    await transport.close();
    process.exit(0);
  });
}
