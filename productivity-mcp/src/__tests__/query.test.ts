import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { handleQueryTool, closeCollection } from "../tools/query.js";
import { createTestVault, cleanupTestVault } from "./helpers.js";

describe("query tools", () => {
  let vaultPath: string;

  beforeAll(() => {
    ({ vaultPath } = createTestVault("query"));
  });

  afterAll(async () => {
    await closeCollection();
    cleanupTestVault("query");
  });

  describe("query_notes", () => {
    it("queries all notes in a folder", async () => {
      const result = await handleQueryTool(
        "query_notes",
        { folder: "people" },
        vaultPath
      );
      expect(result).toBeDefined();
      expect(result!.isError).toBeFalsy();

      const data = JSON.parse(result!.content[0].text);
      expect(data.results.length).toBe(2);
      const paths = data.results.map((r: any) => r.path);
      expect(paths).toContain("people/todd-martinez.md");
      expect(paths).toContain("people/sarah-chen.md");
    });

    it("filters by frontmatter field", async () => {
      const result = await handleQueryTool(
        "query_notes",
        {
          folder: "efforts",
          where: 'effort_status == "active"',
        },
        vaultPath
      );
      expect(result!.isError).toBeFalsy();

      const data = JSON.parse(result!.content[0].text);
      expect(data.results.length).toBe(1);
      expect(data.results[0].frontmatter.title).toBe("Phoenix DB Migration");
    });

    it("filters with complex expressions", async () => {
      const result = await handleQueryTool(
        "query_notes",
        {
          folder: "efforts",
          where: 'effort_status != "done" && effort_status != "dropped"',
        },
        vaultPath
      );
      expect(result!.isError).toBeFalsy();

      const data = JSON.parse(result!.content[0].text);
      expect(data.results.length).toBe(2); // active + planning
    });

    it("projects to specific fields", async () => {
      const result = await handleQueryTool(
        "query_notes",
        {
          folder: "efforts",
          fields: ["title", "effort_status"],
        },
        vaultPath
      );
      expect(result!.isError).toBeFalsy();

      const data = JSON.parse(result!.content[0].text);
      for (const r of data.results) {
        // Should only have title and effort_status
        const keys = Object.keys(r.frontmatter);
        expect(keys.every((k: string) => ["title", "effort_status"].includes(k))).toBe(true);
      }
    });

    it("sorts results", async () => {
      const result = await handleQueryTool(
        "query_notes",
        {
          folder: "efforts",
          order_by: [{ field: "title", direction: "asc" }],
        },
        vaultPath
      );
      expect(result!.isError).toBeFalsy();

      const data = JSON.parse(result!.content[0].text);
      const titles = data.results.map((r: any) => r.frontmatter.title);
      expect(titles[0]).toBe("Horizon Mobile Redesign");
      expect(titles[1]).toBe("Phoenix DB Migration");
    });

    it("supports limit", async () => {
      const result = await handleQueryTool(
        "query_notes",
        { folder: "efforts", limit: 1 },
        vaultPath
      );
      expect(result!.isError).toBeFalsy();

      const data = JSON.parse(result!.content[0].text);
      expect(data.results.length).toBe(1);
      expect(data.meta.total_count).toBe(2);
      expect(data.meta.has_more).toBe(true);
    });

    it("returns empty results for non-matching query", async () => {
      const result = await handleQueryTool(
        "query_notes",
        {
          folder: "efforts",
          where: 'effort_status == "done"',
        },
        vaultPath
      );
      expect(result!.isError).toBeFalsy();

      const data = JSON.parse(result!.content[0].text);
      expect(data.results.length).toBe(0);
    });

    it("returns undefined for unknown tools", async () => {
      const result = await handleQueryTool("unknown_tool", {}, vaultPath);
      expect(result).toBeUndefined();
    });
  });
});
