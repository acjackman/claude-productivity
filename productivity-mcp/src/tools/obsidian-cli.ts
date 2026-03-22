/**
 * Obsidian CLI integration tools.
 * Shells out to the `obsidian` CLI for operations that benefit from
 * Obsidian's plugin ecosystem (template resolution, Bases queries, etc.).
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ToolDefinition, ToolResult } from "../types.js";

const exec = promisify(execFile);

const OBSIDIAN_CLI = "/Applications/Obsidian.app/Contents/MacOS/obsidian";

export function getObsidianCliTools(): ToolDefinition[] {
  return [
    {
      name: "obsidian_create",
      description:
        "Create a note via Obsidian CLI. Triggers Templater folder templates automatically. " +
        "Use this instead of write_note when you want Obsidian's template system to initialize the file " +
        "(dates, IDs, frontmatter). Note: Templater may rename the file — the returned path reflects the final name.",
      inputSchema: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "File path relative to vault root, e.g. 'efforts/temp.md'",
          },
          name: {
            type: "string",
            description: "File name (resolved like wikilinks). Use path for exact placement.",
          },
          template: {
            type: "string",
            description: "Template name (requires core Templates plugin folder configured)",
          },
          content: {
            type: "string",
            description: "Initial content (before template processing)",
          },
          vault: {
            type: "string",
            description: "Vault name. Defaults to OBSIDIAN_VAULT_NAME env var.",
          },
        },
      },
    },
    {
      name: "obsidian_read",
      description:
        "Read a note via Obsidian CLI. Returns the file content as Obsidian sees it.",
      inputSchema: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "File path relative to vault root",
          },
          file: {
            type: "string",
            description: "File name (resolved like wikilinks)",
          },
          vault: {
            type: "string",
            description: "Vault name",
          },
        },
      },
    },
    {
      name: "obsidian_search",
      description:
        "Search the vault via Obsidian's built-in search (uses Obsidian's index).",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query text",
          },
          path: {
            type: "string",
            description: "Limit to folder",
          },
          limit: {
            type: "number",
            description: "Max results",
          },
          format: {
            type: "string",
            enum: ["text", "json"],
            description: "Output format (default: json)",
          },
          vault: {
            type: "string",
            description: "Vault name",
          },
        },
        required: ["query"],
      },
    },
    {
      name: "obsidian_base_query",
      description:
        "Query an Obsidian Base (structured view). Returns results from a Base file's view. " +
        "Useful for querying notes with Obsidian's native filtering/sorting.",
      inputSchema: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Path to the .base file",
          },
          file: {
            type: "string",
            description: "Base file name (resolved like wikilinks)",
          },
          view: {
            type: "string",
            description: "View name within the base (optional)",
          },
          format: {
            type: "string",
            enum: ["json", "csv", "tsv", "md", "paths"],
            description: "Output format (default: json)",
          },
          vault: {
            type: "string",
            description: "Vault name",
          },
        },
      },
    },
    {
      name: "obsidian_property",
      description:
        "Read or set a frontmatter property on a note via Obsidian CLI. " +
        "Uses Obsidian's property system (respects type coercion).",
      inputSchema: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["read", "set", "remove"],
            description: "Operation to perform",
          },
          name: {
            type: "string",
            description: "Property name",
          },
          value: {
            type: "string",
            description: "Property value (for set)",
          },
          type: {
            type: "string",
            enum: ["text", "list", "number", "checkbox", "date", "datetime"],
            description: "Property type (for set)",
          },
          path: {
            type: "string",
            description: "File path",
          },
          file: {
            type: "string",
            description: "File name",
          },
          vault: {
            type: "string",
            description: "Vault name",
          },
        },
        required: ["action", "name"],
      },
    },
    {
      name: "obsidian_command",
      description:
        "Execute any Obsidian command by ID. Use `obsidian commands` to discover available IDs. " +
        "Some commands open UI modals (e.g. tasknotes:create-new-task prompts for title). " +
        "Only use when the user is at their Obsidian desktop.",
      inputSchema: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description:
              "Command ID, e.g. 'tasknotes:create-new-task', 'templater-obsidian:insert-templater'",
          },
          vault: {
            type: "string",
            description: "Vault name",
          },
        },
        required: ["id"],
      },
    },
  ];
}

export async function handleObsidianCliTool(
  toolName: string,
  args: Record<string, any>
): Promise<ToolResult | undefined> {
  switch (toolName) {
    case "obsidian_create":
      return handleCreate(args);
    case "obsidian_read":
      return handleRead(args);
    case "obsidian_search":
      return handleSearch(args);
    case "obsidian_base_query":
      return handleBaseQuery(args);
    case "obsidian_property":
      return handleProperty(args);
    case "obsidian_command":
      return handleCommand(args);
    default:
      return undefined;
  }
}

function buildArgs(command: string, args: Record<string, any>): string[] {
  const cliArgs: string[] = [command];
  const vault = args.vault || process.env.OBSIDIAN_VAULT_NAME;
  if (vault) cliArgs.unshift(`vault=${vault}`);

  for (const [key, value] of Object.entries(args)) {
    if (key === "vault") continue;
    if (value === true) {
      cliArgs.push(key);
    } else if (value !== undefined && value !== null && value !== false) {
      cliArgs.push(`${key}=${String(value)}`);
    }
  }
  return cliArgs;
}

async function runObsidian(cliArgs: string[]): Promise<string> {
  const { stdout, stderr } = await exec(OBSIDIAN_CLI, cliArgs, {
    timeout: 15000,
  });
  if (stderr) throw new Error(stderr.trim());
  return stdout.trim();
}

async function handleCreate(args: Record<string, any>): Promise<ToolResult> {
  const cliArgs = buildArgs("create", {
    path: args.path,
    name: args.name,
    template: args.template,
    content: args.content,
    vault: args.vault,
  });

  const output = await runObsidian(cliArgs);

  // Templater may rename the file. Try to find the actual path from output.
  // Output format: "Created: <path>"
  const match = output.match(/Created:\s*(.+)/);
  const createdPath = match ? match[1].trim() : args.path;

  return ok(JSON.stringify({ created: createdPath, output }));
}

async function handleRead(args: Record<string, any>): Promise<ToolResult> {
  const cliArgs = buildArgs("read", {
    path: args.path,
    file: args.file,
    vault: args.vault,
  });
  const output = await runObsidian(cliArgs);
  return ok(output);
}

async function handleSearch(args: Record<string, any>): Promise<ToolResult> {
  const cliArgs = buildArgs("search", {
    query: args.query,
    path: args.path,
    limit: args.limit,
    format: args.format || "json",
    vault: args.vault,
  });
  const output = await runObsidian(cliArgs);
  return ok(output);
}

async function handleBaseQuery(args: Record<string, any>): Promise<ToolResult> {
  const cliArgs = buildArgs("base:query", {
    path: args.path,
    file: args.file,
    view: args.view,
    format: args.format || "json",
    vault: args.vault,
  });
  const output = await runObsidian(cliArgs);
  return ok(output);
}

async function handleProperty(args: Record<string, any>): Promise<ToolResult> {
  const action = args.action as string;
  let command: string;
  const cliOpts: Record<string, any> = {
    name: args.name,
    path: args.path,
    file: args.file,
    vault: args.vault,
  };

  switch (action) {
    case "read":
      command = "property:read";
      break;
    case "set":
      command = "property:set";
      cliOpts.value = args.value;
      if (args.type) cliOpts.type = args.type;
      break;
    case "remove":
      command = "property:remove";
      break;
    default:
      return err(`Invalid property action: ${action}`);
  }

  const cliArgs = buildArgs(command, cliOpts);
  const output = await runObsidian(cliArgs);
  return ok(output);
}

async function handleCommand(args: Record<string, any>): Promise<ToolResult> {
  const cliArgs = buildArgs("command", {
    id: args.id,
    vault: args.vault,
  });
  const output = await runObsidian(cliArgs);
  return ok(output);
}

function ok(text: string): ToolResult {
  return { content: [{ type: "text", text }] };
}

function err(text: string): ToolResult {
  return { content: [{ type: "text", text: `Error: ${text}` }], isError: true };
}
