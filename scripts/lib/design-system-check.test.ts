import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DESIGN_SYSTEM_FILES } from "../design-system-files";
import { checkDesignSystem } from "./design-system-check";

const EXPECTED_TOKENS = ":root {\n  --x: 1;\n}\n";

let root: string;
let themeDir: string;
let lockPath: string;
let tokensPath: string;

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

/** Writes a theme folder, a matching lock, and current tokens. Each test then breaks one thing. */
function writeInSync(): void {
  const files: Record<string, string> = {};
  for (const file of DESIGN_SYSTEM_FILES) {
    const text = `// ${file}\n`;
    writeFileSync(join(themeDir, file), text);
    files[file] = sha256(text);
  }
  writeLock({ source: "fenzit-app/src/theme", files });
  writeFileSync(tokensPath, EXPECTED_TOKENS);
}

function writeLock(lock: unknown): void {
  writeFileSync(lockPath, JSON.stringify(lock));
}

function readLockFiles(): Record<string, unknown> {
  const lock = JSON.parse(readFileSync(lockPath, "utf8")) as { files: Record<string, unknown> };
  return { ...lock.files };
}

function run(): string[] {
  return checkDesignSystem({
    themeDir,
    lockPath,
    tokensPath,
    expectedTokensCss: EXPECTED_TOKENS,
  });
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "check-design-system-"));
  themeDir = join(root, "theme");
  lockPath = join(root, "lock.json");
  tokensPath = join(root, "tokens.css");
  mkdirSync(themeDir);
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("checkDesignSystem", () => {
  it("passes when every file matches the lock and the tokens are current", () => {
    writeInSync();

    expect(run()).toEqual([]);
  });

  it("ignores extra keys in the lock", () => {
    writeInSync();
    writeLock({ source: "x", files: { ...readLockFiles(), "extra.ts": "abc" } });

    expect(run()).toEqual([]);
  });

  it("reports a file edited after the sync", () => {
    writeInSync();
    writeFileSync(join(themeDir, "colors.ts"), "// hand edit\n");

    expect(run()).toEqual([
      "colors.ts: changed since the last sync. Re-sync from fenzit-app, or revert the edit.",
    ]);
  });

  it("reports a one-character change to a theme file", () => {
    writeInSync();
    writeFileSync(join(themeDir, "spacing.ts"), "// spacing.ts!\n");

    expect(run()).toHaveLength(1);
  });

  it("reports a file the lock has no hash for", () => {
    writeInSync();
    const files = readLockFiles();
    delete files["radius.ts"];
    writeLock({ source: "x", files });

    expect(run()).toEqual([`radius.ts: no hash in ${lockPath}. Run bun run sync:design-system`]);
  });

  it("treats a hash that is not a string as missing, not as a match", () => {
    writeInSync();
    writeLock({ source: "x", files: { ...readLockFiles(), "colors.ts": 42 } });

    expect(run()).toEqual([`colors.ts: no hash in ${lockPath}. Run bun run sync:design-system`]);
  });

  it("reports a theme file that is missing on disk", () => {
    writeInSync();
    rmSync(join(themeDir, "fonts.ts"));

    expect(run()).toEqual([`fonts.ts: missing from ${themeDir}. Run bun run sync:design-system`]);
  });

  it("reports a theme entry that is a folder, not a file", () => {
    writeInSync();
    rmSync(join(themeDir, "fonts.ts"));
    mkdirSync(join(themeDir, "fonts.ts"));

    expect(run()).toEqual([`fonts.ts: missing from ${themeDir}. Run bun run sync:design-system`]);
  });

  it("reports a lock file that is missing, and does not throw", () => {
    writeInSync();
    rmSync(lockPath);

    expect(run()).toEqual([`${lockPath} is missing. Run bun run sync:design-system`]);
  });

  it("reports a lock file that is not JSON, and does not throw", () => {
    writeInSync();
    writeFileSync(lockPath, "{ not json");

    expect(run()).toEqual([`${lockPath} is not valid JSON. Run bun run sync:design-system`]);
  });

  it("reports a lock with no files map", () => {
    writeInSync();
    writeLock({ source: "x" });

    expect(run()).toEqual([`${lockPath} has no "files" map. Run bun run sync:design-system`]);
  });

  it("reports a lock whose files map is null", () => {
    writeInSync();
    writeLock({ files: null });

    expect(run()).toEqual([`${lockPath} has no "files" map. Run bun run sync:design-system`]);
  });

  it("reports tokens.css that is out of date", () => {
    writeInSync();
    writeFileSync(tokensPath, ":root {\n  --x: 2;\n}\n");

    expect(run()).toEqual([`${tokensPath} is out of date. Run bun run tokens`]);
  });

  it("reports tokens.css that is missing", () => {
    writeInSync();
    rmSync(tokensPath);

    expect(run()).toEqual([`${tokensPath} is missing. Run bun run tokens`]);
  });

  it("reports every problem at once, not only the first", () => {
    writeInSync();
    writeFileSync(join(themeDir, "colors.ts"), "// hand edit\n");
    rmSync(join(themeDir, "fonts.ts"));
    writeFileSync(tokensPath, "stale");

    expect(run()).toHaveLength(3);
  });
});
