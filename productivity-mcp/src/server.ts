#!/usr/bin/env node

/**
 * Productivity MCP Server
 *
 * Composes mcpvault's 14 generic vault tools with domain-specific
 * productivity tools for daily notes, efforts, and memory.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  FileSystemService,
  FrontmatterHandler,
  PathFilter,
} from "@bitbonsai/mcpvault";
import { SearchService } from "@bitbonsai/mcpvault";
import { resolve } from "path";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

import { getVaultToolDefinitions, handleVaultTool } from "./tools/vault.js";
import { getDailyNoteTools, handleDailyNoteTool } from "./tools/daily.js";
import { getEffortTools, handleEffortTool } from "./tools/effort.js";
import { getMemoryTools, handleMemoryTool } from "./tools/memory.js";

// Version from package.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(join(__dirname, "../package.json"), "utf-8")
);
const VERSION = packageJson.version;

// CLI args
const cliArgs = process.argv.slice(2);
const firstArg = cliArgs[0];

if (firstArg === "--version" || firstArg === "-v") {
  console.log(VERSION);
  process.exit(0);
}

if (firstArg === "--help" || firstArg === "-h") {
  console.log(`
productivity-mcp v${VERSION}

Obsidian vault MCP server with productivity tools.
Extends mcpvault with daily notes, efforts, and memory management.

Usage:
  productivity-mcp [vault-path]

Arguments:
  [vault-path]    Path to your Obsidian vault (default: cwd)

Options:
  --version, -v   Show version
  --help, -h      Show help
`);
  process.exit(0);
}

// Vault path: CLI arg > OBSIDIAN_VAULT env > cwd
const vaultPathArg = cliArgs.join(" ").trim();
const vaultPath = resolve(vaultPathArg || process.env.OBSIDIAN_VAULT || process.cwd());

// Initialize mcpvault services
const pathFilter = new PathFilter();
const frontmatterHandler = new FrontmatterHandler();
const fileSystem = new FileSystemService(vaultPath, pathFilter, frontmatterHandler);
const searchService = new SearchService(vaultPath, pathFilter);

// Create server
const server = new Server(
  { name: "productivity-mcp", version: VERSION },
  { capabilities: { tools: {} } }
);

// Unified tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    ...getVaultToolDefinitions(),
    ...getDailyNoteTools(),
    ...getEffortTools(),
    ...getMemoryTools(),
  ],
}));

// Unified dispatch
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    const result =
      (await handleVaultTool(name, args, fileSystem, searchService)) ??
      (await handleDailyNoteTool(name, args, fileSystem)) ??
      (await handleEffortTool(name, args, fileSystem)) ??
      (await handleMemoryTool(name, args, fileSystem));

    if (result) return result;

    return {
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
      isError: true,
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
});

// Start
const transport = new StdioServerTransport();
await server.connect(transport);
