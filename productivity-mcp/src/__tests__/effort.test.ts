import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { handleEffortTool } from "../tools/effort.js";
import { createTestVault, cleanupTestVault } from "./helpers.js";
import type { FileSystemService } from "@bitbonsai/mcpvault";

describe("effort tools", () => {
  let fileSystem: FileSystemService;

  beforeEach(() => {
    ({ fileSystem } = createTestVault("effort"));
  });

  afterAll(() => cleanupTestVault("effort"));

  describe("create_effort", () => {
    it("creates an effort with correct structure", async () => {
      const result = await handleEffortTool(
        "create_effort",
        { title: "Add Redis caching layer", status: "active" },
        fileSystem
      );
      expect(result!.isError).toBeFalsy();

      const data = JSON.parse(result!.content[0].text);
      expect(data.path).toMatch(/^efforts\/\d{14}\.md$/);
      expect(data.title).toBe("Add Redis caching layer");
      expect(data.status).toBe("active");
      expect(data.review_after).toBeTruthy(); // 7 days from now

      // Verify the file was created with correct frontmatter
      const note = await fileSystem.readNote(data.path);
      expect(note.frontmatter.title).toBe("Add Redis caching layer");
      expect(note.frontmatter.type).toBe("effort");
      expect(note.frontmatter.status).toBe("active");
      expect(note.frontmatter.tags).toContain("effort");
      expect(note.content).toContain("# Add Redis caching layer");
      expect(note.content).toContain("## Links");
    });

    it("creates with optional slug", async () => {
      const result = await handleEffortTool(
        "create_effort",
        { title: "Redis Cache", slug: "redis-cache" },
        fileSystem
      );
      const data = JSON.parse(result!.content[0].text);
      expect(data.path).toMatch(/^efforts\/\d{14}-redis-cache\.md$/);
    });

    it("creates with linear link", async () => {
      const result = await handleEffortTool(
        "create_effort",
        { title: "Fix Auth", linear: "https://linear.app/acme/issue/PLAT-500/" },
        fileSystem
      );
      const data = JSON.parse(result!.content[0].text);
      const note = await fileSystem.readNote(data.path);
      expect(note.frontmatter.linear).toBe("https://linear.app/acme/issue/PLAT-500/");
    });

    it("defaults to idea status with 14-day review", async () => {
      const result = await handleEffortTool(
        "create_effort",
        { title: "Explore GraphQL" },
        fileSystem
      );
      const data = JSON.parse(result!.content[0].text);
      expect(data.status).toBe("idea");
      // review_after should be ~14 days from now
      expect(data.review_after).toBeTruthy();
    });

    it("rejects invalid status", async () => {
      const result = await handleEffortTool(
        "create_effort",
        { title: "Bad Status", status: "invalid" },
        fileSystem
      );
      expect(result!.isError).toBe(true);
    });
  });

  describe("update_effort_status", () => {
    it("updates status and sets review_after", async () => {
      const result = await handleEffortTool(
        "update_effort_status",
        { path: "efforts/20260318211939.md", status: "waiting" },
        fileSystem
      );
      expect(result!.isError).toBeFalsy();

      const note = await fileSystem.readNote("efforts/20260318211939.md");
      expect(note.frontmatter.status).toBe("waiting");
      expect(note.frontmatter.review_after).toBeTruthy();
    });

    it("handles done status (no review needed)", async () => {
      const result = await handleEffortTool(
        "update_effort_status",
        { path: "efforts/20260318211939.md", status: "done" },
        fileSystem
      );
      const data = JSON.parse(result!.content[0].text);
      expect(data.status).toBe("done");
      expect(data.review_after).toBeNull();
    });
  });

  describe("list_efforts", () => {
    it("lists active efforts excluding done/dropped", async () => {
      const result = await handleEffortTool("list_efforts", {}, fileSystem);
      const data = JSON.parse(result!.content[0].text);
      expect(data).toHaveLength(2); // Phoenix (active) + Horizon (planning)
      expect(data.map((e: any) => e.title)).toContain("Phoenix DB Migration");
      expect(data.map((e: any) => e.title)).toContain("Horizon Mobile Redesign");
    });

    it("filters by status", async () => {
      const result = await handleEffortTool(
        "list_efforts",
        { status: "active" },
        fileSystem
      );
      const data = JSON.parse(result!.content[0].text);
      expect(data).toHaveLength(1);
      expect(data[0].title).toBe("Phoenix DB Migration");
    });
  });
});
