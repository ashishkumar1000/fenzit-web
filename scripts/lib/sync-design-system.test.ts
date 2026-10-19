import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DESIGN_SYSTEM_FILES } from "../design-system-files";
import { SOURCE_LABEL, syncDesignSystem } from "./sync-design-system";

let root: string;
let source: string;
let themeDir: string;
let lockPath: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "sync-design-system-"));
  source = join(root, "app-theme");
  themeDir = join(root, "web-theme");
  lockPath = join(root, "design-system.lock.json");
  mkdirSync(source);
  mkdirSync(themeDir);
  for (const file of DESIGN_SYSTEM_FILES) {
    writeFileSync(join(source, file), `// app ${file}\n`);
  }
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

describe("syncDesignSystem", () => {
  it("copies every design-system file into the theme folder", () => {
    const result = syncDesignSystem({ source, themeDir, lockPath });

    expect(result).toEqual({ ok: true, copied: DESIGN_SYSTEM_FILES.length });
    for (const file of DESIGN_SYSTEM_FILES) {
      expect(readFileSync(join(themeDir, file), "utf8")).toBe(`// app ${file}\n`);
    }
  });

  it("writes a lock whose hashes match the copied bytes", () => {
    syncDesignSystem({ source, themeDir, lockPath });

    const lock = JSON.parse(readFileSync(lockPath, "utf8")) as { files: Record<string, string> };
    for (const file of DESIGN_SYSTEM_FILES) {
      expect(lock.files[file]).toBe(sha256(`// app ${file}\n`));
    }
  });

  it("records a label in the lock, never the machine path of the source", () => {
    syncDesignSystem({ source, themeDir, lockPath });

    const lock = JSON.parse(readFileSync(lockPath, "utf8")) as { source: string };
    expect(lock.source).toBe(SOURCE_LABEL);
    expect(readFileSync(lockPath, "utf8")).not.toContain(root);
  });

  it("overwrites an edited local file with the source bytes instead of merging", () => {
    writeFileSync(join(themeDir, "colors.ts"), "// local edit that must not survive\n");

    syncDesignSystem({ source, themeDir, lockPath });

    expect(readFileSync(join(themeDir, "colors.ts"), "utf8")).toBe("// app colors.ts\n");
  });

  it("copies nothing and writes no lock when one source file is missing", () => {
    const missingFile = DESIGN_SYSTEM_FILES[2];
    rmSync(join(source, missingFile));
    writeFileSync(join(themeDir, DESIGN_SYSTEM_FILES[0]), "// untouched local copy\n");

    const result = syncDesignSystem({ source, themeDir, lockPath });

    expect(result).toEqual({ ok: false, missing: [missingFile] });
    expect(readFileSync(join(themeDir, DESIGN_SYSTEM_FILES[0]), "utf8")).toBe(
      "// untouched local copy\n",
    );
    expect(existsSync(lockPath)).toBe(false);
  });

  it("treats a folder named like a source file as missing, so nothing is half-copied", () => {
    const folderFile = DESIGN_SYSTEM_FILES[DESIGN_SYSTEM_FILES.length - 1];
    rmSync(join(source, folderFile));
    mkdirSync(join(source, folderFile));

    const result = syncDesignSystem({ source, themeDir, lockPath });

    expect(result).toEqual({ ok: false, missing: [folderFile] });
    expect(existsSync(join(themeDir, DESIGN_SYSTEM_FILES[0]))).toBe(false);
  });

  it("reports every missing file, not only the first", () => {
    rmSync(join(source, DESIGN_SYSTEM_FILES[0]));
    rmSync(join(source, DESIGN_SYSTEM_FILES[1]));

    const result = syncDesignSystem({ source, themeDir, lockPath });

    expect(result).toEqual({
      ok: false,
      missing: [DESIGN_SYSTEM_FILES[0], DESIGN_SYSTEM_FILES[1]],
    });
  });
});
