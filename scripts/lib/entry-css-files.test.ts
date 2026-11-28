import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readEntryStylesheets } from "./entry-css-files";

// A miniature of the built index.html: one entry stylesheet, and a body link the prerender step
// never sees because only the head is inlined.
const TEMPLATE = `<!doctype html>
<html>
  <head>
    <link rel="stylesheet" crossorigin href="/assets/index-abc.css">
  </head>
  <body><link rel="stylesheet" href="/assets/body.css"></body>
</html>
`;

let dist: string;

beforeEach(() => {
  dist = mkdtempSync(join(tmpdir(), "entry-css-"));
  mkdirSync(join(dist, "assets"));
  writeFileSync(join(dist, "assets/index-abc.css"), "._entry{color:red}");
});

afterEach(() => {
  rmSync(dist, { recursive: true, force: true });
});

describe("readEntryStylesheets", () => {
  it("reads the head's stylesheet and keys it by the href as written", async () => {
    const cssByHref = await readEntryStylesheets(TEMPLATE, dist);

    expect([...cssByHref.entries()]).toEqual([["/assets/index-abc.css", "._entry{color:red}"]]);
  });

  it("fails the build when the linked file is not in dist", async () => {
    const template = TEMPLATE.replace("index-abc.css", "missing.css");

    await expect(readEntryStylesheets(template, dist)).rejects.toThrow(
      /could not read .*missing\.css, linked as \/assets\/missing\.css/,
    );
  });

  it("fails the build when the link is not a site path", async () => {
    const template = TEMPLATE.replace("/assets/index-abc.css", "https://cdn.example.com/index.css");

    await expect(readEntryStylesheets(template, dist)).rejects.toThrow(/not a site path/);
  });

  it("fails the build when the template links no stylesheet", async () => {
    await expect(readEntryStylesheets("<html><head></head></html>", dist)).rejects.toThrow(
      /no stylesheet link to inline/,
    );
  });
});
