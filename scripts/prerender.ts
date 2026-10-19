// Writes the static HTML for each public page into dist/, so the first paint shows the content
// before the JavaScript loads. Runs after the client and server builds. The client then hydrates
// this markup (see src/main.tsx).
//
// Also writes dist/404.html: the empty app shell. Unknown URLs get it with a 404 status (see
// not_found_handling in wrangler.jsonc), so they never receive the home page's markup.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PAGES: { url: string; file: string }[] = [
  { url: "/", file: "index.html" },
  { url: "/features", file: join("features", "index.html") },
];

const EMPTY_ROOT = '<div id="root"></div>';
const DIST = "dist";

// Loaded by path at run time: the server build is written by the step before this one.
type ServerModule = { renderPage: (url: string) => Promise<string> };
const serverPath = fileURLToPath(new URL("../dist-server/entry-server.js", import.meta.url));
const { renderPage } = (await import(serverPath)) as ServerModule;
const template = await readFile(join(DIST, "index.html"), "utf8");

if (!template.includes(EMPTY_ROOT)) {
  throw new Error(`index.html has no ${EMPTY_ROOT} to fill. Check the template.`);
}

await writeFile(join(DIST, "404.html"), template);
console.log(`wrote the empty app shell -> ${join(DIST, "404.html")}`);

for (const page of PAGES) {
  const html = await renderPage(page.url);
  // A replacer function, not a string: the markup may contain "$&" or "$'", which a string
  // replacement would expand and corrupt.
  const out = template.replace(EMPTY_ROOT, () => `<div id="root">${html}</div>`);
  const target = join(DIST, page.file);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, out);
  console.log(`pre-rendered ${page.url} -> ${target} (${out.length} bytes)`);
}
