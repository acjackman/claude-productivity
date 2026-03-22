/**
 * Structured vault queries via mdbase.
 * Replaces the batch-read-and-filter pattern with indexed frontmatter queries.
 */
import { CollectionAsync } from "@callumalpass/mdbase";
import type { ToolDefinition, ToolResult } from "../types.js";

let _collection: CollectionAsync | null = null;
let _vaultPath: string | null = null;

/**
 * Get or open the mdbase collection for the vault.
 * Cached for the lifetime of the server process.
 */
async function getCollection(vaultPath: string): Promise<CollectionAsync> {
  if (_collection && _vaultPath === vaultPath) return _collection;

  // Close previous collection if vault path changed
  if (_collection) {
    await _collection.close();
    _collection = null;
  }

  const result = await CollectionAsync.open(vaultPath);
  if (result.error || !result.collection) {
    throw new Error(`Failed to open mdbase collection: ${result.error?.message ?? "unknown error"}`);
  }

  _collection = result.collection;
  _vaultPath = vaultPath;
  return _collection;
}

export function getQueryTools(): ToolDefinition[] {
  return [
    {
      name: "query_notes",
      description:
        "Query vault notes by frontmatter fields using mdbase expressions. " +
        "Supports filtering, sorting, pagination, and folder scoping. " +
        "Much more efficient than listing directories and reading files individually. " +
        'Example: query_notes({ folder: "people", where: \'team == "Infrastructure"\', fields: ["title", "team"] })',
      inputSchema: {
        type: "object",
        properties: {
          folder: {
            type: "string",
            description:
              'Scope to a folder (and subfolders). e.g. "people", "efforts", "log/daily"',
          },
          types: {
            type: "array",
            items: { type: "string" },
            description:
              "Filter by mdbase type(s). Only useful if _types/ are defined in the vault.",
          },
          where: {
            type: "string",
            description:
              'mdbase expression to filter notes. e.g. \'effort_status == "active"\', ' +
              '\'team == "Infrastructure" && employee_status == "active"\', ' +
              '\'review_after < today()\', \'tags.contains("effort")\'',
          },
          order_by: {
            type: "array",
            items: {
              type: "object",
              properties: {
                field: { type: "string" },
                direction: { type: "string", enum: ["asc", "desc"] },
              },
              required: ["field"],
            },
            description: "Sort results. e.g. [{field: 'review_after', direction: 'asc'}]",
          },
          fields: {
            type: "array",
            items: { type: "string" },
            description:
              "Frontmatter fields to include in results (reduces token usage). " +
              "Omit to return all frontmatter.",
          },
          limit: {
            type: "number",
            description: "Maximum number of results (default: 50)",
          },
          offset: {
            type: "number",
            description: "Skip first N results (for pagination)",
          },
          include_body: {
            type: "boolean",
            description: "Include note body content in results (default: false)",
            default: false,
          },
        },
      },
    },
  ];
}

export async function handleQueryTool(
  toolName: string,
  args: Record<string, any>,
  vaultPath: string
): Promise<ToolResult | undefined> {
  if (toolName !== "query_notes") return undefined;

  try {
    const collection = await getCollection(vaultPath);

    const queryInput: Record<string, any> = {};
    if (args.folder) queryInput.folder = args.folder;
    if (args.types) queryInput.types = args.types;
    if (args.where) queryInput.where = args.where;
    if (args.order_by) queryInput.order_by = args.order_by;
    if (args.include_body) queryInput.include_body = args.include_body;
    queryInput.limit = args.limit ?? 50;
    if (args.offset) queryInput.offset = args.offset;

    const result = await collection.query(queryInput);

    if (!result.results) {
      return ok(JSON.stringify({ results: [], meta: { total_count: 0 } }));
    }

    // Project to requested fields if specified
    let results = result.results;
    if (args.fields && args.fields.length > 0) {
      const fieldSet = new Set(args.fields as string[]);
      results = results.map((r) => ({
        path: r.path,
        frontmatter: Object.fromEntries(
          Object.entries(r.frontmatter).filter(([k]) => fieldSet.has(k))
        ),
        types: r.types,
        ...(r.body !== undefined ? { body: r.body } : {}),
      }));
    }

    return ok(JSON.stringify({ results, meta: result.meta }, null, 2));
  } catch (error) {
    return err(error instanceof Error ? error.message : "Unknown query error");
  }
}

/**
 * Close the mdbase collection (for cleanup).
 */
export async function closeCollection(): Promise<void> {
  if (_collection) {
    await _collection.close();
    _collection = null;
    _vaultPath = null;
  }
}

function ok(text: string): ToolResult {
  return { content: [{ type: "text", text }] };
}

function err(text: string): ToolResult {
  return { content: [{ type: "text", text: `Error: ${text}` }], isError: true };
}
