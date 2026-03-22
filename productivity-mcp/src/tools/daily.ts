/**
 * Daily note tools: get_daily_note, capture, log_entry, check_off
 */
import type { FileSystemService } from "@bitbonsai/mcpvault";
import type { ToolDefinition, ToolResult } from "../types.js";
import { getWorkDate, getDailyNotePath, parseSections } from "../date-utils.js";

const MINIMAL_DAILY_TEMPLATE = (date: string) =>
  `## Open

## Plan

## Capture

## Log

## Summary
`;

export function getDailyNoteTools(): ToolDefinition[] {
  return [
    {
      name: "get_daily_note",
      description:
        "Get today's daily note (or a specific date). Applies 5am day-boundary logic — before 5am returns yesterday. Creates the note from a minimal template if it doesn't exist yet.",
      inputSchema: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description: "YYYY-MM-DD date. Omit for today (with 5am day-boundary).",
          },
        },
      },
    },
    {
      name: "capture",
      description:
        "Append an item to the ## Capture section of today's daily note.",
      inputSchema: {
        type: "object",
        properties: {
          text: { type: "string", description: "The capture text" },
          effort_link: {
            type: "string",
            description: "Optional effort slug to link, e.g. '20260318211939-effort-name'",
          },
          is_task: {
            type: "boolean",
            description: "Whether to add a checkbox (default: true)",
            default: true,
          },
          date: {
            type: "string",
            description: "YYYY-MM-DD date. Omit for today (with 5am day-boundary).",
          },
        },
        required: ["text"],
      },
    },
    {
      name: "log_entry",
      description:
        "Add a timestamped log entry to the ## Log section of today's daily note.",
      inputSchema: {
        type: "object",
        properties: {
          time: {
            type: "string",
            description: "Time in HH:MM format (24h). Omit to use current time.",
          },
          description: { type: "string", description: "Log entry heading" },
          bullets: {
            type: "array",
            items: { type: "string" },
            description: "Bullet points for this log entry",
          },
          date: {
            type: "string",
            description: "YYYY-MM-DD date. Omit for today (with 5am day-boundary).",
          },
        },
        required: ["description"],
      },
    },
    {
      name: "check_off",
      description:
        "Check off a task item in today's daily note by matching a substring.",
      inputSchema: {
        type: "object",
        properties: {
          section: {
            type: "string",
            enum: ["Open", "Plan", "Capture"],
            description: "Which section to search",
          },
          item_substring: {
            type: "string",
            description: "Substring to match against unchecked items",
          },
          date: {
            type: "string",
            description: "YYYY-MM-DD date. Omit for today (with 5am day-boundary).",
          },
        },
        required: ["section", "item_substring"],
      },
    },
  ];
}

export async function handleDailyNoteTool(
  toolName: string,
  args: Record<string, any>,
  fileSystem: FileSystemService
): Promise<ToolResult | undefined> {
  switch (toolName) {
    case "get_daily_note":
      return handleGetDailyNote(args, fileSystem);
    case "capture":
      return handleCapture(args, fileSystem);
    case "log_entry":
      return handleLogEntry(args, fileSystem);
    case "check_off":
      return handleCheckOff(args, fileSystem);
    default:
      return undefined;
  }
}

async function ensureDailyNote(
  date: string,
  fileSystem: FileSystemService
): Promise<{ path: string; content: string; originalContent: string; frontmatter: Record<string, any> }> {
  const path = getDailyNotePath(date);
  try {
    const note = await fileSystem.readNote(path);
    return { path, content: note.content, originalContent: note.originalContent, frontmatter: note.frontmatter };
  } catch {
    // Note doesn't exist — create it
    const content = MINIMAL_DAILY_TEMPLATE(date);
    await fileSystem.writeNote({ path, content });
    return { path, content, originalContent: content, frontmatter: {} };
  }
}

async function handleGetDailyNote(
  args: Record<string, any>,
  fileSystem: FileSystemService
): Promise<ToolResult> {
  const date = args.date || getWorkDate();
  const { path, content, frontmatter } = await ensureDailyNote(date, fileSystem);
  const sections = parseSections(content);

  const result: Record<string, any> = { date, path, frontmatter };
  for (const [name, body] of sections) {
    if (name !== "_preamble") {
      result[name.toLowerCase()] = body.trim();
    }
  }

  return ok(JSON.stringify(result, null, 2));
}

async function handleCapture(
  args: Record<string, any>,
  fileSystem: FileSystemService
): Promise<ToolResult> {
  const date = args.date || getWorkDate();
  const { path, originalContent } = await ensureDailyNote(date, fileSystem);

  const isTask = args.is_task !== false;
  const prefix = isTask ? "- [ ] " : "- ";
  const effortSuffix = args.effort_link ? ` [[${args.effort_link}]]` : "";
  const line = `${prefix}${args.text}${effortSuffix}`;

  // Find the last line in ## Capture and append after it using patchNote
  const { oldString, newString } = buildSectionAppend(originalContent, "Capture", line);
  if (!oldString || !newString) {
    return err("Could not find ## Capture section in today's daily note");
  }

  await fileSystem.patchNote({ path, oldString, newString });
  return ok(JSON.stringify({ date, path, captured: line }));
}

async function handleLogEntry(
  args: Record<string, any>,
  fileSystem: FileSystemService
): Promise<ToolResult> {
  const date = args.date || getWorkDate();
  const { path, originalContent } = await ensureDailyNote(date, fileSystem);

  const time = args.time || getCurrentTime();
  const bullets = args.bullets || [];
  const entry = [
    `### ${time} — ${args.description}`,
    ...bullets.map((b: string) => `- ${b}`),
    "",
  ].join("\n");

  // Insert at the end of ## Log, before ## Summary using patchNote
  const { oldString, newString } = buildSectionAppend(originalContent, "Log", entry);
  if (!oldString || !newString) {
    return err("Could not find ## Log section in today's daily note");
  }

  await fileSystem.patchNote({ path, oldString, newString });
  return ok(JSON.stringify({ date, path, logged: `${time} — ${args.description}` }));
}

async function handleCheckOff(
  args: Record<string, any>,
  fileSystem: FileSystemService
): Promise<ToolResult> {
  const date = args.date || getWorkDate();
  const { path, originalContent } = await ensureDailyNote(date, fileSystem);

  const section = args.section as string;
  const substring = args.item_substring as string;

  // Use originalContent (includes frontmatter) so patchNote strings match the file
  const lines = originalContent.split("\n");
  const sectionStart = lines.findIndex((l) => l === `## ${section}`);
  if (sectionStart === -1) {
    return err(`Section ## ${section} not found`);
  }

  const matches: { index: number; line: string }[] = [];
  for (let i = sectionStart + 1; i < lines.length; i++) {
    if (lines[i].startsWith("## ")) break; // next section
    if (
      lines[i].includes("- [ ]") &&
      lines[i].toLowerCase().includes(substring.toLowerCase())
    ) {
      matches.push({ index: i, line: lines[i] });
    }
  }

  if (matches.length === 0) {
    return err(`No unchecked items matching "${substring}" in ## ${section}`);
  }
  if (matches.length > 1) {
    const items = matches.map((m) => m.line.trim()).join("\n");
    return err(
      `Multiple matches for "${substring}" in ## ${section} — be more specific:\n${items}`
    );
  }

  const match = matches[0];
  const oldLine = match.line;
  const newLine = oldLine.replace("- [ ]", "- [x]");

  await fileSystem.patchNote({
    path,
    oldString: oldLine,
    newString: newLine,
  });

  return ok(JSON.stringify({ date, path, checked: newLine.trim() }));
}

/**
 * Builds oldString/newString for patchNote to append text at the end of a ## section.
 * Uses originalContent (with frontmatter) so strings match the actual file.
 */
function buildSectionAppend(
  content: string,
  sectionName: string,
  text: string
): { oldString: string | null; newString: string | null } {
  const lines = content.split("\n");
  const sectionStart = lines.findIndex((l) => l === `## ${sectionName}`);
  if (sectionStart === -1) return { oldString: null, newString: null };

  // Find the next ## heading after this section
  let nextSectionIdx = lines.length;
  for (let i = sectionStart + 1; i < lines.length; i++) {
    if (lines[i].startsWith("## ")) {
      nextSectionIdx = i;
      break;
    }
  }

  // Get the section content lines (between heading and next heading)
  const sectionLines = lines.slice(sectionStart, nextSectionIdx);
  const oldString = sectionLines.join("\n");

  // Trim trailing blank lines from section, add new content, restore blank line before next heading
  while (sectionLines.length > 1 && sectionLines[sectionLines.length - 1].trim() === "") {
    sectionLines.pop();
  }
  sectionLines.push(text, "");

  const newString = sectionLines.join("\n");
  return { oldString, newString };
}

function getCurrentTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function ok(text: string): ToolResult {
  return { content: [{ type: "text", text }] };
}

function err(text: string): ToolResult {
  return { content: [{ type: "text", text: `Error: ${text}` }], isError: true };
}
