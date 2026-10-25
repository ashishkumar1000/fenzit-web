import { describe, expect, it } from "bun:test";
import { buildHead, buildSitemap, urlFor, validateTemplateBlocks } from "./page-head";

// A miniature of the built index.html: every tag buildHead rewrites, plus the two JSON blocks
// validateTemplateBlocks checks. The template is the home page's head, so the "from" values are
// the home page's.
const TEMPLATE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Fenzit — Home</title>
    <meta name="description" content="Home description." />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="https://fenzit.com/" />
    <meta property="og:url" content="https://fenzit.com/" />
    <meta property="og:title" content="Fenzit — Home" />
    <meta property="og:description" content="Home description." />
    <meta name="twitter:title" content="Fenzit — Home" />
    <meta name="twitter:description" content="Home description." />
    <script type="application/ld+json">
      { "@context": "https://schema.org", "@graph": [{ "@type": "WebSite" }] }
    </script>
    <script type="speculationrules">
      { "prerender": [
        { "where": { "href_matches": "/features" }, "eagerness": "moderate" },
        { "where": { "href_matches": "/attendance" }, "eagerness": "moderate" }
      ] }
    </script>
  </head>
</html>
`;

const PAGE = {
  path: "/features",
  title: "Fenzit features — the full list",
  description: "Every feature Fenzit ships today.",
};

describe("urlFor", () => {
  it("keeps the home page's trailing slash and drops it elsewhere", () => {
    expect(urlFor("/")).toBe("https://fenzit.com/");
    expect(urlFor("/features")).toBe("https://fenzit.com/features");
  });
});

describe("buildHead", () => {
  it("rewrites every page-level tag for the page", () => {
    const out = buildHead(TEMPLATE, PAGE, false);

    expect(out).toContain(`<title>${PAGE.title}</title>`);
    expect(out).toContain(`<meta name="description" content="${PAGE.description}" />`);
    expect(out).toContain('<link rel="canonical" href="https://fenzit.com/features" />');
    expect(out).toContain('<meta property="og:url" content="https://fenzit.com/features" />');
    expect(out).toContain(`<meta property="og:title" content="${PAGE.title}" />`);
    expect(out).toContain(`<meta name="twitter:title" content="${PAGE.title}" />`);
    expect(out).toContain('<meta name="robots" content="index, follow" />');
  });

  it("leaves the home page's head untouched when the page is home", () => {
    const home = { path: "/", title: "Fenzit — Home", description: "Home description." };
    const out = buildHead(TEMPLATE, home, false);

    expect(out).toBe(TEMPLATE);
  });

  it("marks noindex pages, drops their canonical, and keeps the home share card", () => {
    const out = buildHead(
      TEMPLATE,
      { path: "/login", title: "Log in · Fenzit", description: "" },
      true,
    );

    expect(out).toContain('<meta name="robots" content="noindex" />');
    expect(out).not.toContain('rel="canonical"');
    expect(out).toContain("<title>Log in · Fenzit</title>");
    // The social tags stay as the home page's, so sharing the link shows the brand card.
    expect(out).toContain('<meta property="og:title" content="Fenzit — Home" />');
  });

  it("refuses page text that cannot sit inside a double-quoted attribute", () => {
    expect(() => buildHead(TEMPLATE, { ...PAGE, title: 'The "best" app' }, false)).toThrow(
      /character HTML cannot carry/,
    );
  });

  it("fails the build when a tag to rewrite is missing", () => {
    const broken = TEMPLATE.replace(
      '    <link rel="canonical" href="https://fenzit.com/" />\n',
      "",
    );
    expect(() => buildHead(broken, PAGE, false)).toThrow(/exactly one canonical link .* found 0/);
  });

  it("fails the build when a tag to rewrite appears twice", () => {
    const duplicated = TEMPLATE.replace(
      '<meta name="robots" content="index, follow" />',
      '<meta name="robots" content="index, follow" /><meta name="robots" content="index, follow" />',
    );
    expect(() => buildHead(duplicated, PAGE, false)).toThrow(/exactly one robots meta .* found 2/);
  });
});

describe("buildSitemap", () => {
  it("lists one absolute URL per page, in order", () => {
    const sitemap = buildSitemap(["/", "/features", "/attendance"]);

    expect(sitemap).toContain("<loc>https://fenzit.com/</loc>");
    expect(sitemap).toContain("<loc>https://fenzit.com/features</loc>");
    expect(sitemap).toContain("<loc>https://fenzit.com/attendance</loc>");
    expect(sitemap.match(/<url>/g)?.length).toBe(3);
  });
});

describe("validateTemplateBlocks", () => {
  it("accepts a template whose blocks are valid and cover every public route", () => {
    expect(() => validateTemplateBlocks(TEMPLATE, ["/features", "/attendance"])).not.toThrow();
  });

  it("fails when a public route has no hover-prerender rule", () => {
    expect(() =>
      validateTemplateBlocks(TEMPLATE, ["/features", "/attendance", "/pricing"]),
    ).toThrow(/never prerenders \/pricing/);
  });

  it("fails when the ld+json block is missing, unclosed, or not valid JSON", () => {
    const missing = TEMPLATE.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, "");
    expect(() => validateTemplateBlocks(missing, [])).toThrow(/no application\/ld\+json block/);

    // Removing the last closer leaves the speculationrules block unterminated.
    const unclosed = TEMPLATE.slice(0, TEMPLATE.lastIndexOf("</script>")) + "\n</html>\n";
    expect(() => validateTemplateBlocks(unclosed, [])).toThrow(/never closed/);

    const invalid = TEMPLATE.replace('["@graph"]', '["@graph"]').replace(
      '{ "@context": "https://schema.org", "@graph": [{ "@type": "WebSite" }] }',
      '{ "@context": "https://schema.org", "@graph": [{ "@type": "WebSite" } }',
    );
    expect(() => validateTemplateBlocks(invalid, [])).toThrow(/not valid JSON/);
  });

  it("fails when the ld+json graph is empty", () => {
    const empty = TEMPLATE.replace(
      '{ "@context": "https://schema.org", "@graph": [{ "@type": "WebSite" }] }',
      '{ "@context": "https://schema.org", "@graph": [] }',
    );
    expect(() => validateTemplateBlocks(empty, [])).toThrow(/empty @graph/);
  });
});
