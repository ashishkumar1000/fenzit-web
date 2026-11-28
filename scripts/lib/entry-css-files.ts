// Reads the built stylesheets that the prerender step inlines into each page. Kept apart from
// scripts/prerender.ts so the dist-path mapping and its failure messages can be tested against a
// temporary folder (see entry-css-files.test.ts).

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { stylesheetHrefs } from "./entry-css";

/**
 * Reads every stylesheet the built index.html links, keyed by the href exactly as written in the
 * HTML. The hrefs are site paths (/assets/index-*.css); anything else cannot name a file in dist,
 * so it fails the build rather than reading a nonsense path.
 */
export async function readEntryStylesheets(
  template: string,
  distDir: string,
): Promise<Map<string, string>> {
  const cssByHref = new Map<string, string>();
  for (const href of stylesheetHrefs(template)) {
    if (!/^\/[^/]/.test(href)) {
      throw new Error(`prerender: the template links ${href}, which is not a site path.`);
    }
    const file = join(distDir, href.replace(/^\//, ""));
    try {
      cssByHref.set(href, await readFile(file, "utf8"));
    } catch (error) {
      throw new Error(`prerender: could not read ${file}, linked as ${href}.`, { cause: error });
    }
  }
  if (cssByHref.size === 0) {
    throw new Error("prerender: the built index.html has no stylesheet link to inline.");
  }
  return cssByHref;
}
