// Writes the static HTML for each public page into dist/, so the first paint shows the content
// before the JavaScript loads. Runs after the client and server builds. The client then hydrates
// this markup (see src/main.tsx).
//
// Every page except the home page gets its <head> rewritten for its own URL: title, description,
// robots, canonical and the social tags. The built index.html is the home page, so without this
// each page would ship the home head and /features would declare itself a canonical duplicate
// of /. Client-only pages and the 404 shell are marked noindex instead, so the sign-in and admin
// pages stay out of search results while crawlers can still read the directive.
//
// Also writes dist/sitemap.xml for the indexable pages, which robots.txt points at. The head and
// sitemap builders with their guards live in scripts/lib/page-head.ts (tested there); this file
// is the file I/O around them.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { CLIENT_ONLY_TITLES, PUBLIC_PAGES } from "../src/app/pageMeta";
import type { PageMeta } from "../src/app/pageMeta";
import { buildHead, buildSitemap, validateTemplateBlocks } from "./lib/page-head";

// Every page written with real content. The home page's head lives directly in index.html and is
// the template the others start from (meta: null); each other page names its own meta, and its
// output file is derived from the path, so adding one here is the whole change.
type PrerenderedPage = { path: string; meta: PageMeta | null; file: string };
const metaPages: { meta: PageMeta; file: string }[] = PUBLIC_PAGES.map((meta) => ({
  meta,
  file: join(meta.path.slice(1), "index.html"),
}));
const PRERENDERED_PAGES: PrerenderedPage[] = [
  { path: "/", meta: null, file: "index.html" },
  ...metaPages.map((page) => ({ path: page.meta.path, meta: page.meta, file: page.file })),
];

// The page list is hand-edited data, and a bad entry would fail quietly: a missing slash
// writes into the wrong dist directory, and a duplicate path would overwrite another page.
// ("/" itself is the home entry above, whose head lives directly in index.html.)
const prerenderPaths = PRERENDERED_PAGES.map((page) => page.path);
if (new Set(prerenderPaths).size !== prerenderPaths.length) {
  throw new Error("prerender: the page list has a duplicate path.");
}
for (const meta of PUBLIC_PAGES) {
  if (!meta.path.startsWith("/") || meta.path === "/") {
    throw new Error(`prerender: ${meta.path} is not a canonical path starting with a slash.`);
  }
}

// Pages that depend on the saved sign-in. They are not pre-rendered (see src/app/routes.tsx).
// The console's child sections are separate URLs, so a refresh or deep link
// gets their own shell with a 200 instead of the 404 page.
const CLIENT_ONLY_PATHS = [
  "login",
  "admin",
  "admin/inspect",
  "admin/account",
  "admin/company",
  "admin/company/customers",
  "admin/company/employees",
  "admin/company/jobs",
  "admin/company/holidays",
  "admin/company/attendance",
  "admin/me",
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

const hoverPrerenderPaths = PRERENDERED_PAGES.filter((page) => page.meta !== null).map(
  (page) => page.path,
);
try {
  validateTemplateBlocks(template, hoverPrerenderPaths);
} catch (error) {
  throw new Error(`prerender: ${String(error)}`, { cause: error });
}

const notFoundTitle = CLIENT_ONLY_TITLES["404"];
if (!notFoundTitle) throw new Error("pageMeta is missing the 404 title.");
const notFoundShell = buildHead(
  template,
  { path: "/404", title: notFoundTitle, description: "" },
  true,
);

await writeFile(join(DIST, "404.html"), notFoundShell);
console.log(`wrote the noindex app shell -> ${join(DIST, "404.html")}`);

// Client-only pages: a direct visit gets the shell with a 200, so the page renders from its own
// URL and the status is not a 404. The router then draws the page after the scripts load.
for (const name of CLIENT_ONLY_PATHS) {
  const title = CLIENT_ONLY_TITLES[`/${name}`];
  if (!title) throw new Error(`pageMeta is missing a title for /${name}.`);
  const shell = buildHead(template, { path: `/${name}`, title, description: "" }, true);
  const target = join(DIST, name, "index.html");
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, shell);
  console.log(`wrote the noindex client-only shell -> ${target}`);
}

for (const page of PRERENDERED_PAGES) {
  const html = await renderPage(page.path);
  // React 19 leaves the page's own <title> where the page renders it, so the body can carry a
  // second copy of the head's title. Remove only a body title whose text exactly matches the
  // head's, so a <title> with any other text (an SVG's accessible name) is never touched.
  let body = html;
  if (page.meta) {
    body = body.split(`<title>${page.meta.title}</title>`).join("");
  }
  let out = page.meta ? buildHead(template, page.meta, false) : template;
  // A replacer function, not a string: the markup may contain "$&" or "$'", which a string
  // replacement would expand and corrupt.
  out = out.replace(EMPTY_ROOT, () => `<div id="root">${body}</div>`);
  const target = join(DIST, page.file);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, out);
  console.log(`pre-rendered ${page.path} -> ${target} (${out.length} bytes)`);
}

const sitemap = buildSitemap(PRERENDERED_PAGES.map((page) => page.path));
await writeFile(join(DIST, "sitemap.xml"), sitemap);
console.log(
  `wrote the sitemap with ${PRERENDERED_PAGES.length} pages -> ${join(DIST, "sitemap.xml")}`,
);
