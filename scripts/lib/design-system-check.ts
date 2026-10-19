// Checks that the copied design system still matches the lock hashes, and that
// src/styles/tokens.css is the current build of src/theme. Returns the problems
// as messages. An empty list means the design system is in sync.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DESIGN_SYSTEM_FILES } from "../design-system-files";
import { isFile, sha256File } from "./files";

export interface DesignSystemCheckOptions {
  themeDir: string;
  lockPath: string;
  tokensPath: string;
  /** What tokens.css must contain. The caller passes buildTokensCss(). */
  expectedTokensCss: string;
}

export function checkDesignSystem(options: DesignSystemCheckOptions): string[] {
  const problems: string[] = [];
  const lockHashes = readLockHashes(options.lockPath, problems);

  if (lockHashes) {
    for (const file of DESIGN_SYSTEM_FILES) {
      const expected = lockHashes[file];
      const path = join(options.themeDir, file);

      if (typeof expected !== "string") {
        problems.push(`${file}: no hash in ${options.lockPath}. Run bun run sync:design-system`);
      } else if (!isFile(path)) {
        problems.push(`${file}: missing from ${options.themeDir}. Run bun run sync:design-system`);
      } else if (sha256File(path) !== expected) {
        problems.push(
          `${file}: changed since the last sync. Re-sync from fenzit-app, or revert the edit.`,
        );
      }
    }
  }

  if (!isFile(options.tokensPath)) {
    problems.push(`${options.tokensPath} is missing. Run bun run tokens`);
  } else if (readFileSync(options.tokensPath, "utf8") !== options.expectedTokensCss) {
    problems.push(`${options.tokensPath} is out of date. Run bun run tokens`);
  }

  return problems;
}

/** Returns the `files` map from the lock, or undefined after recording why it could not be read. */
function readLockHashes(lockPath: string, problems: string[]): Record<string, unknown> | undefined {
  if (!isFile(lockPath)) {
    problems.push(`${lockPath} is missing. Run bun run sync:design-system`);
    return undefined;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(lockPath, "utf8"));
  } catch {
    problems.push(`${lockPath} is not valid JSON. Run bun run sync:design-system`);
    return undefined;
  }

  const files =
    typeof parsed === "object" && parsed !== null && "files" in parsed ? parsed.files : undefined;
  if (typeof files !== "object" || files === null) {
    problems.push(`${lockPath} has no "files" map. Run bun run sync:design-system`);
    return undefined;
  }
  return files as Record<string, unknown>;
}
