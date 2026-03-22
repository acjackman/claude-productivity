import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { handleDailyNoteTool } from "../tools/daily.js";
import { createTestVault, cleanupTestVault } from "./helpers.js";
import type { FileSystemService } from "@bitbonsai/mcpvault";

describe("daily note tools", () => {
  let fileSystem: FileSystemService;

  beforeEach(() => {
    ({ fileSystem } = createTestVault("daily"));
  });

  afterAll(() => cleanupTestVault("daily"));

  describe("get_daily_note", () => {
    it("reads an existing daily note", async () => {
      const result = await handleDailyNoteTool(
        "get_daily_note",
        { date: "2026-03-20" },
        fileSystem
      );
      expect(result).toBeDefined();
      expect(result!.isError).toBeFalsy();

      const data = JSON.parse(result!.content[0].text);
      expect(data.date).toBe("2026-03-20");
      expect(data.open).toContain("RFC: API rate limiting");
      expect(data.plan).toContain("Standup");
      expect(data.capture).toContain("Todd asked about Q2");
    });

    it("creates a new daily note when one doesn't exist", async () => {
      const result = await handleDailyNoteTool(
        "get_daily_note",
        { date: "2026-03-21" },
        fileSystem
      );
      expect(result).toBeDefined();
      expect(result!.isError).toBeFalsy();

      const data = JSON.parse(result!.content[0].text);
      expect(data.date).toBe("2026-03-21");
      expect(data.path).toBe("log/daily/2026-03-21.md");
    });

    it("returns undefined for unknown tools", async () => {
      const result = await handleDailyNoteTool("unknown_tool", {}, fileSystem);
      expect(result).toBeUndefined();
    });
  });

  describe("capture", () => {
    it("appends a task to the Capture section", async () => {
      const result = await handleDailyNoteTool(
        "capture",
        { text: "Review Phoenix runbook", date: "2026-03-20" },
        fileSystem
      );
      expect(result!.isError).toBeFalsy();

      // Verify it was written
      const note = await fileSystem.readNote("log/daily/2026-03-20.md");
      expect(note.content).toContain("- [ ] Review Phoenix runbook");
    });

    it("appends with effort link", async () => {
      const result = await handleDailyNoteTool(
        "capture",
        { text: "Check replication lag", effort_link: "20260318211939", date: "2026-03-20" },
        fileSystem
      );
      expect(result!.isError).toBeFalsy();

      const parsed = JSON.parse(result!.content[0].text);
      expect(parsed.captured).toContain("[[20260318211939]]");
    });

    it("supports non-task captures", async () => {
      await handleDailyNoteTool(
        "capture",
        { text: "Interesting blog post on pglogical", is_task: false, date: "2026-03-20" },
        fileSystem
      );

      const note = await fileSystem.readNote("log/daily/2026-03-20.md");
      expect(note.content).toContain("- Interesting blog post on pglogical");
      expect(note.content).not.toContain("- [ ] Interesting blog post");
    });
  });

  describe("log_entry", () => {
    it("adds a timestamped log entry", async () => {
      const result = await handleDailyNoteTool(
        "log_entry",
        {
          time: "14:30",
          description: "1:1 with Priya",
          bullets: ["Discussed Phoenix timeline", "Agreed on Q2 milestone"],
          date: "2026-03-20",
        },
        fileSystem
      );
      expect(result!.isError).toBeFalsy();

      const note = await fileSystem.readNote("log/daily/2026-03-20.md");
      expect(note.content).toContain("### 14:30 — 1:1 with Priya");
      expect(note.content).toContain("- Discussed Phoenix timeline");
    });
  });

  describe("check_off", () => {
    it("checks off an item by substring match", async () => {
      const result = await handleDailyNoteTool(
        "check_off",
        { section: "Plan", item_substring: "rate limiting", date: "2026-03-20" },
        fileSystem
      );
      expect(result!.isError).toBeFalsy();

      const note = await fileSystem.readNote("log/daily/2026-03-20.md");
      expect(note.content).toContain("- [x] Finish rate limiting RFC draft");
    });

    it("errors on ambiguous match", async () => {
      // Both Open items contain links — searching for a broad term
      const result = await handleDailyNoteTool(
        "check_off",
        { section: "Open", item_substring: ":", date: "2026-03-20" },
        fileSystem
      );
      expect(result!.isError).toBe(true);
      expect(result!.content[0].text).toContain("Multiple matches");
    });

    it("errors when no match found", async () => {
      const result = await handleDailyNoteTool(
        "check_off",
        { section: "Plan", item_substring: "nonexistent task", date: "2026-03-20" },
        fileSystem
      );
      expect(result!.isError).toBe(true);
      expect(result!.content[0].text).toContain("No unchecked items");
    });
  });
});
