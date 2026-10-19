// Checks the CSS Modules rule from the web standard, section 5. Every component
// file has a paired <Name>.module.css, and the component imports it as `styles`.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { isDirectory, isFile } from "./files";

export interface StyleCheckResult {
  checked: number;
  problems: string[];
}

export function checkComponentStyles(roots: string[]): StyleCheckResult {
  const problems: string[] = [];
  let checked = 0;

  for (const root of roots) {
    // A renamed folder must fail the check, not quietly pass with nothing to check.
    if (!isDirectory(root)) {
      problems.push(
        `${root}: folder not found. Update the component roots in check-css-modules.ts`,
      );
      continue;
    }

    for (const file of listComponentFiles(root)) {
      checked += 1;
      checkComponentFile(file, problems);
    }
  }

  if (checked === 0) {
    problems.push("No component files were found, so nothing was checked.");
  }

  return { checked, problems };
}

function checkComponentFile(file: string, problems: string[]): void {
  const stylePath = file.replace(/\.tsx$/, ".module.css");
  const styleName = basename(stylePath);

  if (!isFile(stylePath)) {
    problems.push(`${file}: no paired ${styleName}`);
    return;
  }

  // Remove block comments first, so an import inside a multi-line comment does not count.
  const code = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  // Compare whole lines, so a commented-out import (// ...) does not count either.
  const importLine = `import styles from "./${styleName}";`;
  if (!code.split("\n").some((line) => line.trim() === importLine)) {
    problems.push(`${file}: must import its styles as: ${importLine}`);
  }
}

function listComponentFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      return listComponentFiles(path);
    }
    const isComponent = entry.endsWith(".tsx") && !entry.endsWith(".test.tsx");
    return isComponent ? [path] : [];
  });
}
