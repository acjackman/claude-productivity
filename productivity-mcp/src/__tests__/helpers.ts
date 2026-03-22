import { FileSystemService, FrontmatterHandler, PathFilter, SearchService } from "@bitbonsai/mcpvault";
import { resolve } from "path";
import { cpSync, rmSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FIXTURES_VAULT = resolve(__dirname, "../../../test/fixtures/vault");
const WORK_DIR = resolve(__dirname, "../../../test/.work");

/**
 * Creates a fresh copy of the fixture vault for each test.
 * Returns services pointing at the copy so tests can mutate freely.
 */
export function createTestVault(testName: string) {
  const vaultPath = join(WORK_DIR, testName);

  // Clean and copy
  rmSync(vaultPath, { recursive: true, force: true });
  mkdirSync(vaultPath, { recursive: true });
  cpSync(FIXTURES_VAULT, vaultPath, { recursive: true });

  const pathFilter = new PathFilter();
  const frontmatterHandler = new FrontmatterHandler();
  const fileSystem = new FileSystemService(vaultPath, pathFilter, frontmatterHandler);
  const searchService = new SearchService(vaultPath, pathFilter);

  return { vaultPath, fileSystem, searchService };
}

export function cleanupTestVault(testName: string) {
  const vaultPath = join(WORK_DIR, testName);
  rmSync(vaultPath, { recursive: true, force: true });
}
