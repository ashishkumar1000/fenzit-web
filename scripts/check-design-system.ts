// CI check. Fails when a copied design-system file no longer matches its lock
// hash, or when src/styles/tokens.css is out of date with src/theme.

import { DESIGN_SYSTEM_FILES, LOCAL_THEME_DIR, LOCK_PATH } from "./design-system-files";
import { checkDesignSystem } from "./lib/design-system-check";
import { buildTokensCss } from "./lib/tokens-css";

const problems = checkDesignSystem({
  themeDir: LOCAL_THEME_DIR,
  lockPath: LOCK_PATH,
  tokensPath: "src/styles/tokens.css",
  expectedTokensCss: buildTokensCss(),
});

if (problems.length > 0) {
  for (const problem of problems) {
    console.error(problem);
  }
  console.error(`\nDesign system check failed: ${problems.length} problem(s).`);
  process.exit(1);
}

console.log(
  `Design system check passed: ${DESIGN_SYSTEM_FILES.length} files match the lock, tokens are current.`,
);
