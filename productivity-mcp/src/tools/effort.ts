/**
 * Effort tools: create_effort, update_effort_status, list_efforts
 */
import type { FileSystemService } from "@bitbonsai/mcpvault";
import { EFFORT_STATUSES, type EffortStatus, type ToolDefinition, type ToolResult } from "../types.js";
import { generateEffortId, addDays, formatDate, getReviewInterval } from "../date-utils.js";

export function getEffortTools(): ToolDefinition[] {
  return [
    {
      name: "create_effort",
      description:
        "Create a new effort file with correct YYYYMMDDHHMMSS naming, valid frontmatter, and minimal template.",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string", description: "Human-readable effort title" },
          status: {
            type: "string",
            enum: EFFORT_STATUSES as unknown as string[],
            description: "Initial status (default: 'idea')",
            default: "idea",
          },
          slug: {
            type: "string",
            description: "Optional slug suffix for the filename, e.g. 'migrate-auth'",
          },
          linear: {
            type: "string",
            description: "Optional Linear ticket URL (without title slug)",
          },
        },
        required: ["title"],
      },
    },
    {
      name: "update_effort_status",
      description:
        "Update an effort's status and automatically set the correct review_after interval.",
      inputSchema: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Path to the effort file, e.g. 'efforts/20260318211939.md'",
          },
          status: {
            type: "string",
            enum: EFFORT_STATUSES as unknown as string[],
            description: "New status",
          },
        },
        required: ["path", "status"],
      },
    },
    {
      name: "list_efforts",
      description:
        "List efforts with optional status filter. Excludes done/dropped by default.",
      inputSchema: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: EFFORT_STATUSES as unknown as string[],
            description: "Filter to a specific status",
          },
          include_closed: {
            type: "boolean",
            description: "Include done/dropped efforts (default: false)",
            default: false,
          },
        },
      },
    },
  ];
}

export async function handleEffortTool(
  toolName: string,
  args: Record<string, any>,
  fileSystem: FileSystemService
): Promise<ToolResult | undefined> {
  switch (toolName) {
    case "create_effort":
      return handleCreateEffort(args, fileSystem);
    case "update_effort_status":
      return handleUpdateEffortStatus(args, fileSystem);
    case "list_efforts":
      return handleListEfforts(args, fileSystem);
    default:
      return undefined;
  }
}

async function handleCreateEffort(
  args: Record<string, any>,
  fileSystem: FileSystemService
): Promise<ToolResult> {
  const status = (args.status || "idea") as EffortStatus;
  if (!EFFORT_STATUSES.includes(status)) {
    return err(`Invalid status: ${status}. Must be one of: ${EFFORT_STATUSES.join(", ")}`);
  }

  const id = generateEffortId();
  const slug = args.slug ? `-${args.slug}` : "";
  const filename = `${id}${slug}.md`;
  const path = `efforts/${filename}`;

  const today = formatDate(new Date());
  const reviewInterval = getReviewInterval(status);
  const reviewAfter = reviewInterval > 0 ? addDays(today, reviewInterval) : undefined;

  const frontmatter: Record<string, any> = {
    title: args.title,
    type: "effort",
    effort_status: status,
    tags: ["effort"],
  };
  if (reviewAfter) frontmatter.review_after = reviewAfter;
  if (args.linear) frontmatter.linear = args.linear;

  const content = `# ${args.title}\n\n## Links\n`;

  await fileSystem.writeNote({ path, content, frontmatter });

  return ok(JSON.stringify({ path, title: args.title, status, review_after: reviewAfter || null }, null, 2));
}

async function handleUpdateEffortStatus(
  args: Record<string, any>,
  fileSystem: FileSystemService
): Promise<ToolResult> {
  const status = args.status as EffortStatus;
  if (!EFFORT_STATUSES.includes(status)) {
    return err(`Invalid status: ${status}. Must be one of: ${EFFORT_STATUSES.join(", ")}`);
  }

  const today = formatDate(new Date());
  const reviewInterval = getReviewInterval(status);
  const reviewAfter = reviewInterval > 0 ? addDays(today, reviewInterval) : undefined;

  const update: Record<string, any> = { effort_status: status };
  if (reviewAfter) {
    update.review_after = reviewAfter;
  }

  await fileSystem.updateFrontmatter({ path: args.path, frontmatter: update, merge: true });

  return ok(JSON.stringify({ path: args.path, status, review_after: reviewAfter || null }, null, 2));
}

async function handleListEfforts(
  args: Record<string, any>,
  fileSystem: FileSystemService
): Promise<ToolResult> {
  const listing = await fileSystem.listDirectory("efforts");
  const mdFiles = listing.files.filter((f) => f.endsWith(".md"));

  if (mdFiles.length === 0) {
    return ok(JSON.stringify([]));
  }

  // Batch read in groups of 10
  const efforts: Array<Record<string, any>> = [];
  for (let i = 0; i < mdFiles.length; i += 10) {
    const batch = mdFiles.slice(i, i + 10).map((f) => `efforts/${f}`);
    const result = await fileSystem.readMultipleNotes({
      paths: batch,
      includeContent: false,
      includeFrontmatter: true,
    });
    for (const note of result.successful) {
      const fm = note.frontmatter || {};
      efforts.push({
        path: note.path,
        title: fm.title || note.path,
        status: fm.effort_status || fm.status || "unknown",
        review_after: fm.review_after || null,
        linear: fm.linear || null,
      });
    }
  }

  // Filter
  let filtered = efforts;
  if (args.status) {
    filtered = filtered.filter((e) => e.status === args.status);
  } else if (!args.include_closed) {
    filtered = filtered.filter((e) => e.status !== "done" && e.status !== "dropped");
  }

  return ok(JSON.stringify(filtered, null, 2));
}

function ok(text: string): ToolResult {
  return { content: [{ type: "text", text }] };
}

function err(text: string): ToolResult {
  return { content: [{ type: "text", text: `Error: ${text}` }], isError: true };
}
