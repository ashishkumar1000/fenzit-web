import { readFile } from "node:fs/promises";
import { describe, expect, it } from "bun:test";
import { PUBLIC_PAGES } from "./pageMeta";

// Site-wide head invariants over hand-edited data: the titles and descriptions must stay
// distinct and inside the display budgets, and the site stays region-neutral — it is built for
// everyone, so a reverted "Indian teams" or an "areaServed": "IN" must fail here, not ship.

describe("PUBLIC_PAGES", () => {
  it("keeps every title distinct and within the 60-character display budget", () => {
    const titles = PUBLIC_PAGES.map((page) => page.title);
    expect(titles.filter((title, index) => titles.indexOf(title) !== index)).toEqual([]);
    for (const title of titles) {
      expect(title.length).toBeLessThanOrEqual(60);
    }
  });

  it("keeps every description distinct and within the 200-character sanity budget", () => {
    const descriptions = PUBLIC_PAGES.map((page) => page.description);
    expect(
      descriptions.filter((description, index) => descriptions.indexOf(description) !== index),
    ).toEqual([]);
    for (const description of descriptions) {
      expect(description.length).toBeLessThanOrEqual(200);
    }
  });

  it("carries no region markers in any title or description", () => {
    for (const page of PUBLIC_PAGES) {
      expect(/india/i.test(`${page.title} ${page.description}`)).toBe(false);
    }
  });

  it("keeps the index.html structured data region-neutral", async () => {
    const template = await readFile(new URL("../../index.html", import.meta.url), "utf8");
    const block = template.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
    if (!block) throw new Error("index.html has no application/ld+json block");

    const graph: Array<Record<string, unknown>> = JSON.parse(block)["@graph"];
    const organization = graph.find((node) => node["@type"] === "Organization");
    if (!organization) throw new Error("the ld+json graph has no Organization node");

    expect("areaServed" in organization).toBe(false);
    expect(organization.contactPoint).toMatchObject({ availableLanguage: ["en"] });
  });
});
