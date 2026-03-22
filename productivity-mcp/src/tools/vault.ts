/**
 * Re-exports mcpvault's 14 generic vault tools.
 * Tool definitions and dispatch logic extracted from mcpvault's createServer.ts.
 */
import type { FileSystemService, SearchService } from "@bitbonsai/mcpvault";
import { parseFrontmatter } from "@bitbonsai/mcpvault";
import type { ToolDefinition, ToolResult } from "../types.js";

export function getVaultToolDefinitions(): ToolDefinition[] {
  return [
    {
      name: "read_note",
      description: "Read a note from the Obsidian vault",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string", description: "Path to the note relative to vault root" },
          prettyPrint: { type: "boolean", description: "Format JSON response with indentation (default: false)", default: false },
        },
        required: ["path"],
      },
    },
    {
      name: "write_note",
      description: "Write a note to the Obsidian vault",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string", description: "Path to the note relative to vault root" },
          content: { type: "string", description: "Content of the note" },
          frontmatter: { type: "object", description: "Frontmatter object (optional)" },
          mode: { type: "string", enum: ["overwrite", "append", "prepend"], description: "Write mode: 'overwrite' (default), 'append', or 'prepend'", default: "overwrite" },
        },
        required: ["path", "content"],
      },
    },
    {
      name: "patch_note",
      description: "Efficiently update part of a note by replacing a specific string.",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string", description: "Path to the note relative to vault root" },
          oldString: { type: "string", description: "The exact string to replace." },
          newString: { type: "string", description: "The new string to insert in place of oldString" },
          replaceAll: { type: "boolean", description: "If true, replace all occurrences.", default: false },
        },
        required: ["path", "oldString", "newString"],
      },
    },
    {
      name: "list_directory",
      description: "List files and directories in the vault",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string", description: "Path relative to vault root (default: '/')", default: "/" },
          prettyPrint: { type: "boolean", description: "Format JSON response with indentation (default: false)", default: false },
        },
      },
    },
    {
      name: "delete_note",
      description: "Delete a note from the Obsidian vault (requires confirmation)",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string", description: "Path to the note relative to vault root" },
          confirmPath: { type: "string", description: "Confirmation: must exactly match the path parameter" },
        },
        required: ["path", "confirmPath"],
      },
    },
    {
      name: "search_notes",
      description: "Search for notes in the vault by content or frontmatter",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query text" },
          limit: { type: "number", description: "Maximum number of results (default: 5, max: 20)", default: 5 },
          searchContent: { type: "boolean", description: "Search in note content (default: true)", default: true },
          searchFrontmatter: { type: "boolean", description: "Search in frontmatter (default: false)", default: false },
          caseSensitive: { type: "boolean", description: "Case sensitive search (default: false)", default: false },
          prettyPrint: { type: "boolean", description: "Format JSON response with indentation (default: false)", default: false },
        },
        required: ["query"],
      },
    },
    {
      name: "move_note",
      description: "Move or rename a note in the vault",
      inputSchema: {
        type: "object",
        properties: {
          oldPath: { type: "string", description: "Current path of the note" },
          newPath: { type: "string", description: "New path for the note" },
          overwrite: { type: "boolean", description: "Allow overwriting existing file (default: false)", default: false },
        },
        required: ["oldPath", "newPath"],
      },
    },
    {
      name: "move_file",
      description: "Move or rename any file in the vault (binary-safe, requires confirmation)",
      inputSchema: {
        type: "object",
        properties: {
          oldPath: { type: "string", description: "Current path of the file" },
          newPath: { type: "string", description: "New path for the file" },
          confirmOldPath: { type: "string", description: "Confirmation: must exactly match oldPath" },
          confirmNewPath: { type: "string", description: "Confirmation: must exactly match newPath" },
          overwrite: { type: "boolean", description: "Allow overwriting existing file (default: false)", default: false },
        },
        required: ["oldPath", "newPath", "confirmOldPath", "confirmNewPath"],
      },
    },
    {
      name: "read_multiple_notes",
      description: "Read multiple notes in a batch (max 10 files)",
      inputSchema: {
        type: "object",
        properties: {
          paths: { type: "array", items: { type: "string" }, description: "Array of note paths to read", maxItems: 10 },
          includeContent: { type: "boolean", description: "Include note content (default: true)", default: true },
          includeFrontmatter: { type: "boolean", description: "Include frontmatter (default: true)", default: true },
          prettyPrint: { type: "boolean", description: "Format JSON response with indentation (default: false)", default: false },
        },
        required: ["paths"],
      },
    },
    {
      name: "update_frontmatter",
      description: "Update frontmatter of a note without changing content",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string", description: "Path to the note" },
          frontmatter: { type: "object", description: "Frontmatter object to update" },
          merge: { type: "boolean", description: "Merge with existing frontmatter (default: true)", default: true },
        },
        required: ["path", "frontmatter"],
      },
    },
    {
      name: "get_notes_info",
      description: "Get metadata for notes without reading full content",
      inputSchema: {
        type: "object",
        properties: {
          paths: { type: "array", items: { type: "string" }, description: "Array of note paths" },
          prettyPrint: { type: "boolean", description: "Format JSON response with indentation (default: false)", default: false },
        },
        required: ["paths"],
      },
    },
    {
      name: "get_frontmatter",
      description: "Extract frontmatter from a note without reading the content",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string", description: "Path to the note relative to vault root" },
          prettyPrint: { type: "boolean", description: "Format JSON response with indentation (default: false)", default: false },
        },
        required: ["path"],
      },
    },
    {
      name: "manage_tags",
      description: "Add, remove, or list tags in a note",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string", description: "Path to the note relative to vault root" },
          operation: { type: "string", enum: ["add", "remove", "list"], description: "Operation: 'add', 'remove', or 'list'" },
          tags: { type: "array", items: { type: "string" }, description: "Array of tags (required for 'add' and 'remove')" },
        },
        required: ["path", "operation"],
      },
    },
    {
      name: "get_vault_stats",
      description: "Get vault statistics including total notes, folders, size, and recently modified files.",
      inputSchema: {
        type: "object",
        properties: {
          recentCount: { type: "number", description: "Number of recently modified files to return (default: 5, max: 20)", default: 5 },
          prettyPrint: { type: "boolean", description: "Format JSON response with indentation (default: false)", default: false },
        },
      },
    },
  ];
}

function trimPaths(args: Record<string, any>): Record<string, any> {
  const trimmed = { ...args };
  for (const key of ["path", "oldPath", "newPath", "confirmPath", "confirmOldPath", "confirmNewPath"]) {
    if (typeof trimmed[key] === "string") trimmed[key] = trimmed[key].trim();
  }
  if (Array.isArray(trimmed.paths)) {
    trimmed.paths = trimmed.paths.map((p: any) => (typeof p === "string" ? p.trim() : p));
  }
  return trimmed;
}

export async function handleVaultTool(
  toolName: string,
  rawArgs: Record<string, any>,
  fileSystem: FileSystemService,
  searchService: SearchService
): Promise<ToolResult | undefined> {
  const args = trimPaths(rawArgs);
  const indent = (pp: boolean | undefined) => (pp ? 2 : undefined);

  switch (toolName) {
    case "read_note": {
      const note = await fileSystem.readNote(args.path);
      return ok(JSON.stringify({ fm: note.frontmatter, content: note.content }, null, indent(args.prettyPrint)));
    }
    case "write_note": {
      const fm = parseFrontmatter(args.frontmatter);
      await fileSystem.writeNote({
        path: args.path,
        content: args.content,
        ...(fm !== undefined && { frontmatter: fm }),
        mode: args.mode || "overwrite",
      });
      return ok(`Successfully wrote note: ${args.path} (mode: ${args.mode || "overwrite"})`);
    }
    case "patch_note": {
      const result = await fileSystem.patchNote({
        path: args.path,
        oldString: args.oldString,
        newString: args.newString,
        replaceAll: args.replaceAll,
      });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], isError: !result.success };
    }
    case "list_directory": {
      const listing = await fileSystem.listDirectory(args.path || "");
      return ok(JSON.stringify({ dirs: listing.directories, files: listing.files }, null, indent(args.prettyPrint)));
    }
    case "delete_note": {
      const result = await fileSystem.deleteNote({ path: args.path, confirmPath: args.confirmPath });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], isError: !result.success };
    }
    case "search_notes": {
      const results = await searchService.search({
        query: args.query,
        limit: args.limit,
        searchContent: args.searchContent,
        searchFrontmatter: args.searchFrontmatter,
        caseSensitive: args.caseSensitive,
      });
      return ok(JSON.stringify(results, null, indent(args.prettyPrint)));
    }
    case "move_note": {
      const result = await fileSystem.moveNote({ oldPath: args.oldPath, newPath: args.newPath, overwrite: args.overwrite });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], isError: !result.success };
    }
    case "move_file": {
      const result = await fileSystem.moveFile({
        oldPath: args.oldPath,
        newPath: args.newPath,
        confirmOldPath: args.confirmOldPath,
        confirmNewPath: args.confirmNewPath,
        overwrite: args.overwrite,
      });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], isError: !result.success };
    }
    case "read_multiple_notes": {
      const result = await fileSystem.readMultipleNotes({
        paths: args.paths,
        includeContent: args.includeContent,
        includeFrontmatter: args.includeFrontmatter,
      });
      return ok(JSON.stringify({ ok: result.successful, err: result.failed }, null, indent(args.prettyPrint)));
    }
    case "update_frontmatter": {
      const fm = parseFrontmatter(args.frontmatter);
      if (!fm) throw new Error("frontmatter is required");
      await fileSystem.updateFrontmatter({ path: args.path, frontmatter: fm, merge: args.merge });
      return ok(`Successfully updated frontmatter for: ${args.path}`);
    }
    case "get_notes_info": {
      const result = await fileSystem.getNotesInfo(args.paths);
      return ok(JSON.stringify(result, null, indent(args.prettyPrint)));
    }
    case "get_frontmatter": {
      const note = await fileSystem.readNote(args.path);
      return ok(JSON.stringify(note.frontmatter, null, indent(args.prettyPrint)));
    }
    case "manage_tags": {
      const result = await fileSystem.manageTags({ path: args.path, operation: args.operation, tags: args.tags });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], isError: !result.success };
    }
    case "get_vault_stats": {
      const recentCount = Math.min(args.recentCount || 5, 20);
      const stats = await fileSystem.getVaultStats(recentCount);
      return ok(
        JSON.stringify(
          { notes: stats.totalNotes, folders: stats.totalFolders, size: stats.totalSize, recent: stats.recentlyModified },
          null,
          indent(args.prettyPrint)
        )
      );
    }
    default:
      return undefined;
  }
}

function ok(text: string): ToolResult {
  return { content: [{ type: "text", text }] };
}
