import { describe, expect, it } from "bun:test";
import { inlineEntryStylesheets, stylesheetHrefs } from "./entry-css";

// A miniature of the built index.html: Vite's entry stylesheet link (rel first, crossorigin, double
// quotes), a head-only preload the swap must ignore, and a body that stays untouched.
const PAGE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Fenzit</title>
    <link rel="preload" href="/assets/font.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="stylesheet" crossorigin href="/assets/index-abc.css">
  </head>
  <body>
    <div id="root"><link rel="preload" as="image" href="/assets/logo.png"></div>
  </body>
</html>
`;

const ENTRY = "/assets/index-abc.css";

describe("stylesheetHrefs", () => {
  it("lists the head's stylesheet hrefs and nothing from the body", () => {
    const page = PAGE.replace("</body>", '<link rel="stylesheet" href="/assets/late.css"></body>');

    expect(stylesheetHrefs(page)).toEqual([ENTRY]);
  });

  it("returns nothing when the document has no head", () => {
    expect(stylesheetHrefs('<link rel="stylesheet" href="/assets/index-abc.css">')).toEqual([]);
  });
});

describe("inlineEntryStylesheets", () => {
  it("swaps the entry stylesheet for a style tag with the same CSS", () => {
    const out = inlineEntryStylesheets(PAGE, new Map([[ENTRY, "._a{color:red}"]]), "/");

    expect(out).toContain("<style>._a{color:red}</style>");
    expect(out).not.toContain('<link rel="stylesheet"');
    expect(out).toContain('<link rel="preload" href="/assets/font.woff2" as="font"');
  });

  it("leaves the rest of the document byte for byte", () => {
    const out = inlineEntryStylesheets(PAGE, new Map([[ENTRY, "._a{}"]]), "/");

    expect(out).toContain('<div id="root"><link rel="preload" as="image" href="/assets/logo.png">');
    expect(out.endsWith("</html>\n")).toBe(true);
  });

  it("inlines each stylesheet in document order", () => {
    const page = PAGE.replace(
      "</head>",
      '<link rel="stylesheet" href="/assets/page-def.css">\n  </head>',
    );
    const out = inlineEntryStylesheets(
      page,
      new Map([
        [ENTRY, "._entry{}"],
        ["/assets/page-def.css", "._page{}"],
      ]),
      "/features",
    );

    expect(out).toContain("<style>._entry{}</style>");
    expect(out).toContain("<style>._page{}</style>");
    expect(out.indexOf("._entry{}")).toBeLessThan(out.indexOf("._page{}"));
  });

  it("inlines a link whose attributes come in another order", () => {
    const page = PAGE.replace(
      '<link rel="stylesheet" crossorigin href="/assets/index-abc.css">',
      '<link href="/assets/index-abc.css" crossorigin rel="stylesheet">',
    );
    const out = inlineEntryStylesheets(page, new Map([[ENTRY, "._a{}"]]), "/");

    expect(out).toContain("<style>._a{}</style>");
  });

  it("fails the build when the head has no stylesheet link", () => {
    const page = PAGE.replace(/<link rel="stylesheet"[^>]*>/, "");

    expect(() => inlineEntryStylesheets(page, new Map(), "/features")).toThrow(
      /\/features has no stylesheet link/,
    );
  });

  it("fails the build when a linked stylesheet was not read", () => {
    expect(() => inlineEntryStylesheets(PAGE, new Map(), "/features")).toThrow(
      /no CSS was read for \/assets\/index-abc\.css, linked by \/features/,
    );
  });

  it("fails the build on a stylesheet link it cannot inline", () => {
    const page = PAGE.replace("</head>", '<link rel=stylesheet href="/assets/odd.css"></head>');

    expect(() => inlineEntryStylesheets(page, new Map([[ENTRY, "._a{}"]]), "/features")).toThrow(
      /stylesheet link this build cannot inline/,
    );
  });

  it("fails the build on a conditional stylesheet link", () => {
    const page = PAGE.replace('rel="stylesheet"', 'rel="stylesheet" media="(min-width: 768px)"');

    expect(() => inlineEntryStylesheets(page, new Map([[ENTRY, "._a{}"]]), "/features")).toThrow(
      /conditional stylesheet link/,
    );
  });

  it("keeps the spelling and case of an escaped closing style tag", () => {
    const out = inlineEntryStylesheets(
      PAGE,
      new Map([[ENTRY, '._a::after{content:"</STYLE>"}']]),
      "/",
    );

    expect(out).toContain('<style>._a::after{content:"<\\/STYLE>"}</style>');
    expect(out.match(/<\/style>/gi)).toHaveLength(1);
  });

  it("never rewrites a stylesheet the page renders in its body", () => {
    const page = PAGE.replace("</body>", '<link rel="stylesheet" href="/assets/late.css"></body>');
    const out = inlineEntryStylesheets(page, new Map([[ENTRY, "._a{}"]]), "/");

    expect(out).toContain('<link rel="stylesheet" href="/assets/late.css">');
  });
});
