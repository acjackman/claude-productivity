/**
 * Memory tools: decode, remember_term, remember_person
 */
import type { FileSystemService } from "@bitbonsai/mcpvault";
import type { ToolDefinition, ToolResult } from "../types.js";

const AGENTS_PATH = "memory/AGENTS.md";
const GLOSSARY_PATH = "memory/glossary.md";

export function getMemoryTools(): ToolDefinition[] {
  return [
    {
      name: "decode",
      description:
        "Decode shorthand terms, acronyms, nicknames, or project codenames using the two-tier memory system (AGENTS.md hot cache first, then glossary.md).",
      inputSchema: {
        type: "object",
        properties: {
          terms: {
            type: "array",
            items: { type: "string" },
            description: "Terms to decode",
          },
        },
        required: ["terms"],
      },
    },
    {
      name: "remember_term",
      description:
        "Add a new term/acronym to the glossary. Appends to the appropriate table in memory/glossary.md.",
      inputSchema: {
        type: "object",
        properties: {
          term: { type: "string", description: "The term or acronym" },
          meaning: { type: "string", description: "What it means" },
          context: { type: "string", description: "Optional usage context" },
        },
        required: ["term", "meaning"],
      },
    },
    {
      name: "remember_person",
      description:
        "Add or update a person in the memory system. Creates/updates people/{slug}.md and adds nickname entries to the glossary.",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "Full name" },
          role: { type: "string", description: "Role or title" },
          team: { type: "string", description: "Team name" },
          nicknames: {
            type: "array",
            items: { type: "string" },
            description: "Nicknames or short names used to refer to this person",
          },
          notes: { type: "string", description: "Additional context" },
        },
        required: ["name", "role"],
      },
    },
  ];
}

export async function handleMemoryTool(
  toolName: string,
  args: Record<string, any>,
  fileSystem: FileSystemService
): Promise<ToolResult | undefined> {
  switch (toolName) {
    case "decode":
      return handleDecode(args, fileSystem);
    case "remember_term":
      return handleRememberTerm(args, fileSystem);
    case "remember_person":
      return handleRememberPerson(args, fileSystem);
    default:
      return undefined;
  }
}

async function handleDecode(
  args: Record<string, any>,
  fileSystem: FileSystemService
): Promise<ToolResult> {
  const terms = args.terms as string[];
  const results: Array<{ term: string; meaning: string | null; source: string }> = [];
  const notFound: string[] = [];

  // Tier 1: AGENTS.md hot cache
  let agentsContent = "";
  try {
    const note = await fileSystem.readNote(AGENTS_PATH);
    agentsContent = note.content;
  } catch {
    // AGENTS.md doesn't exist — skip to tier 2
  }

  for (const term of terms) {
    const meaning = searchContent(agentsContent, term);
    if (meaning) {
      results.push({ term, meaning, source: "agents" });
    } else {
      notFound.push(term);
    }
  }

  // Tier 2: glossary.md for anything not found
  if (notFound.length > 0) {
    let glossaryContent = "";
    try {
      const note = await fileSystem.readNote(GLOSSARY_PATH);
      glossaryContent = note.content;
    } catch {
      // glossary doesn't exist
    }

    for (const term of notFound) {
      const meaning = searchContent(glossaryContent, term);
      if (meaning) {
        results.push({ term, meaning, source: "glossary" });
      } else {
        results.push({ term, meaning: null, source: "not_found" });
      }
    }
  }

  return ok(JSON.stringify(results, null, 2));
}

/**
 * Search markdown content (particularly tables) for a term.
 * Looks for the term in table rows (| term | meaning |) and returns the rest of the row.
 */
function searchContent(content: string, term: string): string | null {
  if (!content) return null;
  const termLower = term.toLowerCase();

  // Search in markdown table rows: | Term | Meaning | ...
  const lines = content.split("\n");
  for (const line of lines) {
    if (!line.includes("|")) continue;
    const cells = line
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);
    if (cells.length < 2) continue;

    // Check if the first cell matches (stripping bold markers)
    const firstCell = cells[0].replace(/\*\*/g, "").toLowerCase();
    if (firstCell === termLower) {
      return cells.slice(1).join(" — ").trim();
    }
  }

  // Fallback: search for the term as a bold heading or in a line
  for (const line of lines) {
    if (
      line.toLowerCase().includes(termLower) &&
      (line.includes("**") || line.startsWith("- ") || line.startsWith("#"))
    ) {
      return line.replace(/^[\s\-#*]+/, "").trim();
    }
  }

  return null;
}

async function handleRememberTerm(
  args: Record<string, any>,
  fileSystem: FileSystemService
): Promise<ToolResult> {
  const { term, meaning, context } = args;

  // Determine the right table — all-caps or contains only caps+digits = acronym
  const isAcronym = /^[A-Z0-9/]+$/.test(term);
  const tableName = isAcronym ? "Acronyms" : "Internal Terms";

  let glossaryContent = "";
  try {
    const note = await fileSystem.readNote(GLOSSARY_PATH);
    glossaryContent = note.content;
  } catch {
    // Create glossary from scratch
    const initial = `# Glossary

Workplace shorthand, acronyms, and internal language.

## Acronyms
| Term | Meaning | Context |
|------|---------|---------|

## Internal Terms
| Term | Meaning |
|------|---------|

## Nicknames → Full Names
| Nickname | Person |
|----------|--------|

## Project Codenames
| Codename | Project |
|----------|---------|
`;
    await fileSystem.writeNote({ path: GLOSSARY_PATH, content: initial });
    glossaryContent = initial;
  }

  // Build the new row
  const newRow = isAcronym
    ? `| ${term} | ${meaning} | ${context || ""} |`
    : `| ${term} | ${meaning} |`;

  // Find the last row of the target table and insert after it
  const inserted = insertTableRow(glossaryContent, tableName, newRow);
  if (!inserted) {
    return err(`Could not find ## ${tableName} table in glossary`);
  }

  await fileSystem.writeNote({ path: GLOSSARY_PATH, content: inserted });
  return ok(JSON.stringify({ term, meaning, table: tableName }));
}

async function handleRememberPerson(
  args: Record<string, any>,
  fileSystem: FileSystemService
): Promise<ToolResult> {
  const { name, role, team, nicknames, notes } = args;
  const slug = slugify(name);
  const path = `people/${slug}.md`;

  // Build person note
  const lines = [`# ${name}`, ""];
  if (nicknames?.length) lines.push(`**Also known as:** ${nicknames.join(", ")}`);
  lines.push(`**Role:** ${role}`);
  if (team) lines.push(`**Team:** ${team}`);
  lines.push("");
  if (notes) {
    lines.push("## Notes", notes, "");
  }

  const content = lines.join("\n");

  // Check if person file already exists
  try {
    await fileSystem.readNote(path);
    // Exists — overwrite with updated content
    await fileSystem.writeNote({ path, content });
  } catch {
    // New person
    await fileSystem.writeNote({ path, content });
  }

  // Add nickname entries to glossary
  if (nicknames?.length) {
    try {
      const glossary = await fileSystem.readNote(GLOSSARY_PATH);
      let glossaryContent = glossary.content;
      for (const nick of nicknames) {
        const row = `| ${nick} | ${name} (${role}) |`;
        const updated = insertTableRow(glossaryContent, "Nicknames → Full Names", row);
        if (updated) glossaryContent = updated;
      }
      await fileSystem.writeNote({ path: GLOSSARY_PATH, content: glossaryContent });
    } catch {
      // Glossary doesn't exist — will be created on next remember_term call
    }
  }

  return ok(JSON.stringify({ path, name, role, nicknames: nicknames || [] }));
}

/**
 * Insert a row at the end of a markdown table under a ## heading.
 */
function insertTableRow(
  content: string,
  sectionName: string,
  row: string
): string | null {
  const lines = content.split("\n");
  const sectionIdx = lines.findIndex((l) => l.trim() === `## ${sectionName}`);
  if (sectionIdx === -1) return null;

  // Find the table: skip heading, find header row, separator, then data rows
  let lastTableRow = -1;
  let inTable = false;
  for (let i = sectionIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("## ")) break; // next section
    if (line.startsWith("|")) {
      inTable = true;
      lastTableRow = i;
    } else if (inTable && line === "") {
      break; // end of table
    }
  }

  if (lastTableRow === -1) return null;

  // Insert after the last table row
  lines.splice(lastTableRow + 1, 0, row);
  return lines.join("\n");
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function ok(text: string): ToolResult {
  return { content: [{ type: "text", text }] };
}

function err(text: string): ToolResult {
  return { content: [{ type: "text", text: `Error: ${text}` }], isError: true };
}
