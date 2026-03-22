import type { EffortStatus } from "./types.js";

const DAY_BOUNDARY_HOUR = 5;

/**
 * Returns the "work date" — if it's before 5am, the work day is yesterday.
 */
export function getWorkDate(now?: Date): string {
  const d = now ?? new Date();
  // Work in local time
  if (d.getHours() < DAY_BOUNDARY_HOUR) {
    d.setDate(d.getDate() - 1);
  }
  return formatDate(d);
}

export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getDailyNotePath(date: string): string {
  return `log/daily/${date}.md`;
}

/**
 * Generates a YYYYMMDDHHMMSS effort ID from the current time.
 */
export function generateEffortId(now?: Date): string {
  const d = now ?? new Date();
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${y}${mo}${day}${h}${mi}${s}`;
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00"); // noon to avoid DST issues
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

/**
 * Returns the default review interval in days for a given effort status.
 */
export function getReviewInterval(status: EffortStatus): number {
  switch (status) {
    case "active":
    case "waiting":
    case "blocked":
      return 7;
    case "idea":
    case "planning":
      return 14;
    case "paused":
      return 30;
    case "done":
    case "dropped":
      return 0; // no review needed
  }
}

/**
 * Parses a markdown note into sections by ## headings.
 * Returns a Map from section name to its content (including any ### sub-headings).
 */
export function parseSections(
  content: string
): Map<string, string> {
  const sections = new Map<string, string>();
  const lines = content.split("\n");
  let currentSection = "_preamble";
  let currentLines: string[] = [];

  for (const line of lines) {
    const match = line.match(/^## (.+)$/);
    if (match) {
      sections.set(currentSection, currentLines.join("\n"));
      currentSection = match[1];
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  sections.set(currentSection, currentLines.join("\n"));
  return sections;
}
