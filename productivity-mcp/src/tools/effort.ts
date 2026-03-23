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
          priority: {
            type: "string",
            enum: ["none", "low", "medium", "high", "urgent"],
            description: "Priority level (default: 'none')",
            default: "none",
          },
          goal: {
            type: "string",
            description: "What does done look like? Written as a ## Goal section.",
          },
          context: {
            type: "string",
            description: "Background info, constraints, related work. Written as a ## Context section.",
          },
          next_steps: {
            type: "array",
            items: { type: "string" },
            description: "Concrete next actions. Written as checkboxes in a ## Next Steps section.",
          },
          links: {
            type: "array",
            items: { type: "string" },
            description: "Markdown links to related resources. Added to the ## Links section.",
          },
          open_questions: {
            type: "array",
            items: { type: "string" },
            description: "Unknowns or decisions needed. Written as a ## Open Questions section.",
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
      name: "effort_append_section",
      description:
        "Append or replace a section in an existing effort. Use for adding Goal, Context, " +
        "Next Steps, Open Questions, Log entries, or any ## heading to an effort file.",
      inputSchema: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Path to the effort file, e.g. 'efforts/20260318211939.md'",
          },
          section: {
            type: "string",
            description: "Section heading (without ##), e.g. 'Goal', 'Next Steps', 'Log'",
          },
          content: {
            type: "string",
            description: "Markdown content for the section body",
          },
          replace: {
            type: "boolean",
            description: "Replace existing section content (default: false, appends instead)",
            default: false,
          },
        },
        required: ["path", "section", "content"],
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
    case "effort_append_section":
      return handleAppendSection(args, fileSystem);
    case "list_efforts":
      return handleListEfforts(args, fileSystem);
    default:
      return undefined;
  }
}

/**
 * Build effort body from provided fields. Sections are only included
 * when the caller provides content for them.
 */
function buildEffortBody(args: Record<string, any>): string {
  const lines: string[] = [`# ${args.title}`, ""];

  if (args.goal) {
    lines.push("## Goal", args.goal, "");
  }

  if (args.context) {
    lines.push("## Context", args.context, "");
  }

  if (args.next_steps?.length) {
    lines.push("## Next Steps");
    for (const step of args.next_steps) {
      lines.push(`- [ ] ${step}`);
    }
    lines.push("");
  }

  if (args.open_questions?.length) {
    lines.push("## Open Questions");
    for (const q of args.open_questions) {
      lines.push(`- ${q}`);
    }
    lines.push("");
  }

  // Links section is always present (effort template convention)
  lines.push("## Links");
  if (args.links?.length) {
    for (const link of args.links) {
      lines.push(`- ${link}`);
    }
  }
  lines.push("");

  return lines.join("\n");
}

async function handleCreateEffort(
  args: Record<string, any>,
  fileSystem: FileSystemService
): Promise<ToolResult> {
  const status = (args.status || "idea") as EffortStatus;
  if (!EFFORT_STATUSES.includes(status)) {
    return err(`Invalid status: ${status}. Must be one of: ${EFFORT_STATUSES.join(", ")}`);
  }

  // Try Obsidian CLI first — lets Templater handle template resolution
  const cliResult = await tryCreateViaObsidianCli(args, status, fileSystem);
  if (cliResult) return cliResult;

  // Fallback: create directly via mcpvault
  return createDirectly(args, status, fileSystem);
}

/**
 * Create effort via Obsidian CLI. Templater auto-applies the folder template,
 * resolves dates/IDs/frontmatter. We then patch in the title and any extra fields.
 */
async function tryCreateViaObsidianCli(
  args: Record<string, any>,
  status: EffortStatus,
  fileSystem: FileSystemService
): Promise<ToolResult | null> {
  try {
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const exec = promisify(execFile);
    const CLI = "/Applications/Obsidian.app/Contents/MacOS/obsidian";

    const vaultName = process.env.OBSIDIAN_VAULT_NAME;
    if (!vaultName) return null; // Can't use CLI without vault name

    // Create a temp file in efforts/ — Templater will rename it to YYYYMMDDHHMMSS.md
    const tempName = `_creating-${Date.now()}.md`;
    const cliArgs = [
      `vault=${vaultName}`,
      "create",
      `path=efforts/${tempName}`,
    ];

    const { stdout } = await exec(CLI, cliArgs, { timeout: 15000 });
    const match = stdout.match(/Created:\s*(.+)/);
    if (!match) return null;

    // Templater renames the file — the output tells us the initial path,
    // but we need to find the actual file. Wait briefly for Templater to process.
    await new Promise((r) => setTimeout(r, 2000));

    // Find the newest effort file (Templater renamed it)
    const listing = await fileSystem.listDirectory("efforts");
    const mdFiles = listing.files
      .filter((f) => f.endsWith(".md"))
      .sort()
      .reverse();

    // The newest file by name (YYYYMMDDHHMMSS sorting) is our creation
    const createdFile = mdFiles[0];
    if (!createdFile) return null;

    const path = `efforts/${createdFile}`;

    // Patch in the title and any non-default fields
    const updates: Record<string, any> = { title: args.title };
    if (status !== "idea") updates.effort_status = status;
    if (args.priority && args.priority !== "none") updates.priority = args.priority;
    if (args.linear) updates.linear = args.linear;

    // Update review_after based on status (Templater defaults to 14 days)
    const today = formatDate(new Date());
    const reviewInterval = getReviewInterval(status);
    if (reviewInterval > 0 && reviewInterval !== 14) {
      updates.review_after = addDays(today, reviewInterval);
    }

    await fileSystem.updateFrontmatter({ path, frontmatter: updates, merge: true });

    // Patch the body: replace Templater's "# null\n\n## Links" with rich content
    const richBody = buildEffortBody(args);
    await fileSystem.patchNote({ path, oldString: "# null\n\n## Links", newString: richBody.trimEnd() });

    const note = await fileSystem.readNote(path);
    const reviewAfter = note.frontmatter.review_after || null;

    return ok(JSON.stringify({ path, title: args.title, status, review_after: reviewAfter, via: "obsidian-cli" }, null, 2));
  } catch {
    return null; // Fall through to direct creation
  }
}

/**
 * Direct creation via mcpvault — used when Obsidian CLI isn't available
 * (e.g., in tests, CI, or when Obsidian isn't running).
 */
async function createDirectly(
  args: Record<string, any>,
  status: EffortStatus,
  fileSystem: FileSystemService
): Promise<ToolResult> {
  const id = generateEffortId();
  const slug = args.slug ? `-${args.slug}` : "";
  const filename = `${id}${slug}.md`;
  const path = `efforts/${filename}`;

  const now = new Date();
  const today = formatDate(now);
  const reviewInterval = getReviewInterval(status);
  const reviewAfter = reviewInterval > 0 ? addDays(today, reviewInterval) : undefined;
  const isoNow = now.toISOString().replace(/\.\d{3}Z$/, "Z");
  const dailyLink = `[[log/daily/${today}|${today}]]`;

  const frontmatter: Record<string, any> = {
    title: args.title,
    type: "effort",
    effort_status: status,
    priority: args.priority || "none",
    created_at: isoNow,
    modified_at: isoNow,
    review_after: reviewAfter || today,
    created_day: dailyLink,
    modified_days: [dailyLink],
    tags: ["effort"],
  };
  if (args.linear) frontmatter.linear = args.linear;

  const content = buildEffortBody(args);
  await fileSystem.writeNote({ path, content, frontmatter });

  return ok(JSON.stringify({ path, title: args.title, status, review_after: reviewAfter || null, via: "direct" }, null, 2));
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

async function handleAppendSection(
  args: Record<string, any>,
  fileSystem: FileSystemService
): Promise<ToolResult> {
  const { path, section, content, replace } = args;
  const heading = `## ${section}`;

  const note = await fileSystem.readNote(path);
  const originalContent = note.originalContent;

  // Check if section already exists
  const lines = originalContent.split("\n");
  const sectionIdx = lines.findIndex((l) => l === heading);

  if (sectionIdx !== -1 && !replace) {
    // Append to existing section — find the end of it
    let endIdx = lines.length;
    for (let i = sectionIdx + 1; i < lines.length; i++) {
      if (lines[i].startsWith("## ")) {
        endIdx = i;
        break;
      }
    }
    // Insert before the next heading
    const oldSection = lines.slice(sectionIdx, endIdx).join("\n");
    const trimmed = oldSection.replace(/\n+$/, "");
    const newSection = `${trimmed}\n${content}\n`;
    await fileSystem.patchNote({ path, oldString: oldSection, newString: newSection });
  } else if (sectionIdx !== -1 && replace) {
    // Replace existing section content
    let endIdx = lines.length;
    for (let i = sectionIdx + 1; i < lines.length; i++) {
      if (lines[i].startsWith("## ")) {
        endIdx = i;
        break;
      }
    }
    const oldSection = lines.slice(sectionIdx, endIdx).join("\n");
    const newSection = `${heading}\n${content}\n`;
    await fileSystem.patchNote({ path, oldString: oldSection, newString: newSection });
  } else {
    // Section doesn't exist — append before ## Links (convention) or at end
    const linksIdx = lines.findIndex((l) => l === "## Links");
    if (linksIdx !== -1) {
      const anchor = lines[linksIdx];
      await fileSystem.patchNote({
        path,
        oldString: anchor,
        newString: `${heading}\n${content}\n\n${anchor}`,
      });
    } else {
      // Append at end
      await fileSystem.writeNote({
        path,
        content: `\n${heading}\n${content}\n`,
        mode: "append",
      });
    }
  }

  return ok(JSON.stringify({ path, section, action: replace ? "replaced" : "appended" }));
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
