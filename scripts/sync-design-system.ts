// Copies the design system from fenzit-app into this repo, then records a hash
// of every copied file. Run it on your machine after the app's theme changes:
//   bun scripts/sync-design-system.ts [path-to-fenzit-app/src/theme]
// Then run `bun run tokens` and commit. CI cannot see the app repo, so it checks
// the hashes with `bun run check:design-system` instead.

import { DESIGN_SYSTEM_FILES, LOCAL_THEME_DIR, LOCK_PATH } from "./design-system-files";
import { syncDesignSystem } from "./lib/sync-design-system";

const source = process.argv[2] ?? "../fenzit-app/src/theme";
const result = syncDesignSystem({ source, themeDir: LOCAL_THEME_DIR, lockPath: LOCK_PATH });

if (!result.ok) {
  console.error(`Missing in ${source}: ${result.missing.join(", ")}. Nothing was copied.`);
  process.exit(1);
}

console.log(`Synced ${DESIGN_SYSTEM_FILES.length} files from ${source}. Now run: bun run tokens`);
