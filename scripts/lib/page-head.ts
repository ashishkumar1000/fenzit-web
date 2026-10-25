// Builds and validates the per-page <head> content for the prerender step, pure of file
// access, so the guards can be tested directly (see page-head.test.ts). The I/O lives in
// scripts/prerender.ts.

import { SITE_URL } from "../../src/app/pageMeta";

/** The absolute URL for a path, without a trailing slash except on the home page. */
export function urlFor(path: string): string {
  return path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`;
}

/**
 * Rewrites the head of the built index.html for one page. Each swap must match exactly once, so
 * a template change that removes, renames, or duplicates a tag fails the build instead of
 * silently shipping the home page's head.
 */
export function buildHead(
  template: string,
  page: { path: string; title: string; description: string },
  noindex: boolean,
): string {
  // Titles and descriptions are injected into double-quoted attributes verbatim. A double quote
  // or an angle bracket would break the tag, and a raw & should be an entity, so refuse all of
  // them at the build. An apostrophe is safe inside a double-quoted attribute.
  for (const text of [page.title, page.description]) {
    if (/["<>&]/.test(text)) {
      throw new Error(
        `pageMeta text for ${page.path} has a character HTML cannot carry in an attribute. Keep titles and descriptions plain.`,
      );
    }
  }
  const url = urlFor(page.path);
  let out = template;
  const set = (pattern: RegExp, replacement: string, label: string) => {
    const hits = out.split(pattern).length - 1;
    if (hits !== 1) {
      throw new Error(`expected exactly one ${label} in the built index.html, found ${hits}.`);
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

/** The sitemap for the indexable pages. No lastmod: nothing verifiable dates the pages. */
export function buildSitemap(paths: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((path) => `  <url><loc>${urlFor(path)}</loc></url>`).join("\n")}
</urlset>
`;
}

function jsonBlock(template: string, type: string): unknown {
  const open = `<script type="${type}">`;
  const start = template.indexOf(open);
  if (start === -1) throw new Error(`the built index.html has no ${type} block.`);
  const end = template.indexOf("</script>", start);
  if (end === -1) throw new Error(`the ${type} block is never closed.`);
  try {
    return JSON.parse(template.slice(start + open.length, end));
  } catch (error) {
    throw new Error(`the ${type} block is not valid JSON: ${String(error)}`, { cause: error });
  }
}

/**
 * The structured-data graph and the hover-prerender rules are template content copied verbatim
 * into every page, so a bad edit would ship silently on all of them. Parsing them here fails the
 * build instead. Every path in hoverPrerenderPaths must have a matching speculation rule.
 */
export function validateTemplateBlocks(template: string, hoverPrerenderPaths: string[]): void {
  const graph = jsonBlock(template, "application/ld+json") as { "@graph"?: unknown[] };
  if (!Array.isArray(graph["@graph"]) || graph["@graph"].length === 0) {
    throw new Error("the ld+json block has an empty @graph. Check the template.");
  }

  const rules = jsonBlock(template, "speculationrules") as {
    prerender?: { where?: { href_matches?: string } }[];
  };
  const missingRule = hoverPrerenderPaths.find(
    (path) => !(rules.prerender ?? []).some((rule) => rule.where?.href_matches === path),
  );
  if (missingRule) {
    throw new Error(
      `the speculationrules block never prerenders ${missingRule}. Keep an href_matches entry on every public route.`,
    );
  }
}
