// Checks the CSS Modules rule from the web standard, section 5. Every component
// file has a paired <Name>.module.css, and the component imports it as `styles`.
// Run with `bun run check:styles`. CI runs it before deploy.

import { checkComponentStyles } from "./lib/css-modules-check";

const COMPONENT_ROOTS = ["src/components", "src/features", "src/pages"];

const { checked, problems } = checkComponentStyles(COMPONENT_ROOTS);

if (problems.length > 0) {
  for (const problem of problems) {
    console.error(problem);
  }
  console.error(`\nCSS Modules check failed: ${problems.length} problem(s).`);
  process.exit(1);
}

console.log(`CSS Modules check passed: ${checked} component files have paired styles.`);
