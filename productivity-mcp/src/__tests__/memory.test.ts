import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { handleMemoryTool } from "../tools/memory.js";
import { createTestVault, cleanupTestVault } from "./helpers.js";
import type { FileSystemService } from "@bitbonsai/mcpvault";

describe("memory tools", () => {
  let fileSystem: FileSystemService;

  beforeEach(() => {
    ({ fileSystem } = createTestVault("memory"));
  });

  afterAll(() => cleanupTestVault("memory"));

  describe("decode", () => {
    it("decodes terms from AGENTS.md hot cache", async () => {
      const result = await handleMemoryTool(
        "decode",
        { terms: ["Todd", "PSR"] },
        fileSystem
      );
      expect(result!.isError).toBeFalsy();

      const data = JSON.parse(result!.content[0].text);
      expect(data).toHaveLength(2);

      const todd = data.find((d: any) => d.term === "Todd");
      expect(todd.meaning).toContain("Todd Martinez");
      expect(todd.source).toBe("agents");

      const psr = data.find((d: any) => d.term === "PSR");
      expect(psr.meaning).toContain("Pipeline Status Report");
      expect(psr.source).toBe("agents");
    });

    it("falls back to glossary for terms not in hot cache", async () => {
      const result = await handleMemoryTool(
        "decode",
        { terms: ["DORA"] },
        fileSystem
      );
      const data = JSON.parse(result!.content[0].text);
      expect(data[0].source).toBe("glossary");
      expect(data[0].meaning).toContain("DevOps Research");
    });

    it("returns not_found for unknown terms", async () => {
      const result = await handleMemoryTool(
        "decode",
        { terms: ["XYZZY"] },
        fileSystem
      );
      const data = JSON.parse(result!.content[0].text);
      expect(data[0].source).toBe("not_found");
      expect(data[0].meaning).toBeNull();
    });

    it("handles a mix of found and not-found", async () => {
      const result = await handleMemoryTool(
        "decode",
        { terms: ["Todd", "XYZZY", "DORA"] },
        fileSystem
      );
      const data = JSON.parse(result!.content[0].text);
      expect(data.find((d: any) => d.term === "Todd").source).toBe("agents");
      expect(data.find((d: any) => d.term === "XYZZY").source).toBe("not_found");
      expect(data.find((d: any) => d.term === "DORA").source).toBe("glossary");
    });
  });

  describe("remember_term", () => {
    it("adds an acronym to the glossary", async () => {
      const result = await handleMemoryTool(
        "remember_term",
        { term: "SLA", meaning: "Service Level Agreement", context: "Customer contracts" },
        fileSystem
      );
      expect(result!.isError).toBeFalsy();

      const glossary = await fileSystem.readNote("memory/glossary.md");
      expect(glossary.content).toContain("| SLA | Service Level Agreement | Customer contracts |");
    });

    it("adds an internal term to the right table", async () => {
      const result = await handleMemoryTool(
        "remember_term",
        { term: "the freeze", meaning: "Q2 code freeze period" },
        fileSystem
      );
      expect(result!.isError).toBeFalsy();

      const data = JSON.parse(result!.content[0].text);
      expect(data.table).toBe("Internal Terms");

      const glossary = await fileSystem.readNote("memory/glossary.md");
      expect(glossary.content).toContain("| the freeze | Q2 code freeze period |");
    });

    it("creates glossary from scratch if missing", async () => {
      // Delete the glossary
      await fileSystem.deleteNote({ path: "memory/glossary.md", confirmPath: "memory/glossary.md" });

      const result = await handleMemoryTool(
        "remember_term",
        { term: "API", meaning: "Application Programming Interface" },
        fileSystem
      );
      expect(result!.isError).toBeFalsy();

      const glossary = await fileSystem.readNote("memory/glossary.md");
      expect(glossary.content).toContain("| API | Application Programming Interface |");
    });
  });

  describe("remember_person", () => {
    it("creates a new person file", async () => {
      const result = await handleMemoryTool(
        "remember_person",
        {
          name: "Jordan Lee",
          role: "Product Manager",
          team: "Mobile",
          nicknames: ["JL", "Jordan"],
        },
        fileSystem
      );
      expect(result!.isError).toBeFalsy();

      const person = await fileSystem.readNote("people/jordan-lee.md");
      expect(person.content).toContain("# Jordan Lee");
      expect(person.content).toContain("**Role:** Product Manager");
      expect(person.content).toContain("**Team:** Mobile");
      expect(person.content).toContain("JL, Jordan");

      // Check glossary was updated with nicknames
      const glossary = await fileSystem.readNote("memory/glossary.md");
      expect(glossary.content).toContain("| JL | Jordan Lee (Product Manager) |");
      expect(glossary.content).toContain("| Jordan | Jordan Lee (Product Manager) |");
    });

    it("updates an existing person file", async () => {
      const result = await handleMemoryTool(
        "remember_person",
        { name: "Todd Martinez", role: "Finance Director", notes: "Got promoted in Q1" },
        fileSystem
      );
      expect(result!.isError).toBeFalsy();

      const person = await fileSystem.readNote("people/todd-martinez.md");
      expect(person.content).toContain("**Role:** Finance Director");
      expect(person.content).toContain("Got promoted in Q1");
    });
  });
});
