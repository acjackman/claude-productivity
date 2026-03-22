export const EFFORT_STATUSES = [
  "idea",
  "planning",
  "waiting",
  "blocked",
  "active",
  "paused",
  "done",
  "dropped",
] as const;

export type EffortStatus = (typeof EFFORT_STATUSES)[number];

export const DAILY_NOTE_SECTIONS = [
  "Open",
  "Plan",
  "Capture",
  "Log",
  "Summary",
] as const;

export type DailyNoteSection = (typeof DAILY_NOTE_SECTIONS)[number];

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ToolResult {
  [key: string]: unknown;
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}
