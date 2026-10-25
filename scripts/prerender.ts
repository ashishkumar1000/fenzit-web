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
// Also writes dist/sitemap.xml for the indexable pages, which robots.txt points at.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { CLIENT_ONLY_TITLES, FEATURES_PAGE, SITE_URL } from "../src/app/pageMeta";
import type { PageMeta } from "../src/app/pageMeta";

// Every page written with real content. The home page's head lives directly in index.html and is
// the template the others start from (meta: null); each other page names its own meta and output
// file, so adding one here is the whole change.
type PrerenderedPage = { path: string; meta: PageMeta | null; file: string };
const PRERENDERED_PAGES: PrerenderedPage[] = [
  { path: "/", meta: null, file: "index.html" },
  { path: FEATURES_PAGE.path, meta: FEATURES_PAGE, file: join("features", "index.html") },
];

// Pages that depend on the saved sign-in. They are not pre-rendered (see src/app/routes.tsx).
const CLIENT_ONLY_PATHS = ["login", "admin"];

const EMPTY_ROOT = '<div id="root"></div>';
const DIST = "dist";

/** The absolute URL for a path, without a trailing slash except on the home page. */
function urlFor(path: string): string {
  return path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`;
}

/**
 * Rewrites the head of the built index.html for one page. Each swap must match exactly once, so
 * a template change that removes, renames, or duplicates a tag fails the build instead of
 * silently shipping the home page's head.
 */
function withHead(
  template: string,
  page: { path: string; title: string; description: string },
  noindex: boolean,
): string {
  // Titles and descriptions are injected into attributes verbatim. A quote or angle bracket in
  // pageMeta would break every shipped page's head, so refuse it at the build.
  for (const text of [page.title, page.description]) {
    if (/["'<>&]/.test(text)) {
      throw new Error(
        `prerender: pageMeta text for ${page.path} has a character HTML cannot carry in an attribute. Keep titles and descriptions plain.`,
      );
    }
  }
  const url = urlFor(page.path);
  let out = template;
  const set = (pattern: RegExp, replacement: string, label: string) => {
    const hits = out.split(pattern).length - 1;
    if (hits !== 1) {
      throw new Error(
        `prerender: expected exactly one ${label} in the built index.html, found ${hits}.`,
      );
    }
    out = out.replace(pattern, () => replacement);
  };

  set(/<title>[\s\S]*?<\/title>/, `<title>${page.title}</title>`, "title");
  set(
    /<link rel="canonical" href="[^"]*" \/>/,
    noindex ? "" : `<link rel="canonical" href="${url}" />`,
    "canonical link",
  );
  set(
    /<meta name="robots" content="[^"]*" \/>/,
    `<meta name="robots" content="${noindex ? "noindex" : "index, follow"}" />`,
    "robots meta",
  );
  set(
    /<meta property="og:url" content="[^"]*" \/>/,
    `<meta property="og:url" content="${url}" />`,
    "og:url",
  );
  if (!noindex) {
    set(
      /<meta name="description" content="[^"]*" \/>/,
      `<meta name="description" content="${page.description}" />`,
      "meta description",
    );
    // A noindex page earns nothing from social tags tuned to its own copy, and the home share
    // card is the right preview when someone shares the sign-in link.
    set(
      /<meta property="og:title" content="[^"]*" \/>/,
      `<meta property="og:title" content="${page.title}" />`,
      "og:title",
    );
    set(
      /<meta property="og:description" content="[^"]*" \/>/,
      `<meta property="og:description" content="${page.description}" />`,
      "og:description",
    );
    set(
      /<meta name="twitter:title" content="[^"]*" \/>/,
      `<meta name="twitter:title" content="${page.title}" />`,
      "twitter:title",
    );
    set(
      /<meta name="twitter:description" content="[^"]*" \/>/,
      `<meta name="twitter:description" content="${page.description}" />`,
      "twitter:description",
    );
  }
  return out;
}

// Loaded by path at run time: the server build is written by the step before this one.
type ServerModule = { renderPage: (url: string) => Promise<string> };
const serverPath = fileURLToPath(new URL("../dist-server/entry-server.js", import.meta.url));
const { renderPage } = (await import(serverPath)) as ServerModule;
const template = await readFile(join(DIST, "index.html"), "utf8");

if (!template.includes(EMPTY_ROOT)) {
  throw new Error(`index.html has no ${EMPTY_ROOT} to fill. Check the template.`);
}

// Parses one JSON block out of the template by its script type. The structured-data graph and
// the hover-prerender rule are copied verbatim into every page, so a bad edit would ship
// silently on all of them; parsing here fails the build instead.
function jsonBlock(type: string): unknown {
  const open = `<script type="${type}">`;
  const start = template.indexOf(open);
  if (start === -1) throw new Error(`prerender: the built index.html has no ${type} block.`);
  const end = template.indexOf("</script>", start);
  if (end === -1) throw new Error(`prerender: the ${type} block is never closed.`);
  try {
    return JSON.parse(template.slice(start + open.length, end));
  } catch (error) {
    throw new Error(`prerender: the ${type} block is not valid JSON: ${String(error)}`, {
      cause: error,
    });
  }
}

const graph = jsonBlock("application/ld+json") as { "@graph"?: unknown[] };
if (!Array.isArray(graph["@graph"]) || graph["@graph"].length === 0) {
  throw new Error("prerender: the ld+json block has an empty @graph. Check the template.");
}

const rules = jsonBlock("speculationrules") as {
  prerender?: { where?: { href_matches?: string } }[];
};
if (!(rules.prerender ?? []).some((rule) => rule.where?.href_matches === FEATURES_PAGE.path)) {
  throw new Error(
    `prerender: the speculationrules block never prerenders ${FEATURES_PAGE.path}. Keep its href_matches on the route.`,
  );
}

const notFoundTitle = CLIENT_ONLY_TITLES["404"];
if (!notFoundTitle) throw new Error("pageMeta is missing the 404 title.");
const notFoundShell = withHead(
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
  const shell = withHead(template, { path: `/${name}`, title, description: "" }, true);
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
  let out = page.meta ? withHead(template, page.meta, false) : template;
  // A replacer function, not a string: the markup may contain "$&" or "$'", which a string
  // replacement would expand and corrupt.
  out = out.replace(EMPTY_ROOT, () => `<div id="root">${body}</div>`);
  const target = join(DIST, page.file);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, out);
  console.log(`pre-rendered ${page.path} -> ${target} (${out.length} bytes)`);
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PRERENDERED_PAGES.map((page) => `  <url><loc>${urlFor(page.path)}</loc></url>`).join("\n")}
</urlset>
`;
await writeFile(join(DIST, "sitemap.xml"), sitemap);
console.log(
  `wrote the sitemap with ${PRERENDERED_PAGES.length} pages -> ${join(DIST, "sitemap.xml")}`,
);
