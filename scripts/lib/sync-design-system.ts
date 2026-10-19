// Copies the design system from fenzit-app into this repo and records a hash of
// every copied file. The check in design-system-check.ts reads that lock file.

import { copyFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DESIGN_SYSTEM_FILES } from "../design-system-files";
import { isFile, sha256File } from "./files";

/** Written into the lock file in place of the machine path, so no local path gets committed. */
export const SOURCE_LABEL = "fenzit-app/src/theme";

export interface SyncOptions {
  /** The fenzit-app theme folder to copy from. */
  source: string;
  /** This repo's theme folder to copy into. */
  themeDir: string;
  lockPath: string;
}

export type SyncResult = { ok: true; copied: number } | { ok: false; missing: string[] };

/**
 * Copies every design-system file, then writes the lock. Every source is checked
 * first, so a missing or non-file source copies nothing and leaves the theme as it was.
 */
export function syncDesignSystem(options: SyncOptions): SyncResult {
  const missing = DESIGN_SYSTEM_FILES.filter((file) => !isFile(join(options.source, file)));
  if (missing.length > 0) {
    return { ok: false, missing };
  }

  for (const file of DESIGN_SYSTEM_FILES) {
    copyFileSync(join(options.source, file), join(options.themeDir, file));
  }

  const files: Record<string, string> = {};
  for (const file of DESIGN_SYSTEM_FILES) {
    files[file] = sha256File(join(options.themeDir, file));
  }

  writeFileSync(options.lockPath, JSON.stringify({ source: SOURCE_LABEL, files }, null, 2) + "\n");
  return { ok: true, copied: DESIGN_SYSTEM_FILES.length };
}
