import { readFile } from "node:fs/promises";
import { describe, expect, it } from "bun:test";
import { PUBLIC_PAGES } from "./pageMeta";

// Site-wide head invariants over hand-edited data: the titles and descriptions must stay
// distinct and inside the display budgets, and the site stays region-neutral — it is built for
// everyone, so a reverted "Indian teams" or an "areaServed": "IN" must fail here, not ship.
// The site is a live product: a reverted "Launching 2026", an early-access remnant, or an
// iOS mention must fail here too, because none of those is true today.

const FORBIDDEN_LAUNCH_COPY = /early access|waitlist|launching 2026/i;
const FORBIDDEN_PLATFORM_COPY = /\bios\b|ios\s?\d|iphone|app[\s-]?store/i;

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

  it("carries no pre-launch copy or iOS mention in any title or description", () => {
    for (const page of PUBLIC_PAGES) {
      const text = `${page.title} ${page.description}`;
      expect(FORBIDDEN_LAUNCH_COPY.test(text)).toBe(false);
      expect(FORBIDDEN_PLATFORM_COPY.test(text)).toBe(false);
    }
  });

  it("keeps the home template free of pre-launch copy, with Android-only structured data", async () => {
    const template = await readFile(new URL("../../index.html", import.meta.url), "utf8");
    expect(FORBIDDEN_LAUNCH_COPY.test(template)).toBe(false);
    expect(FORBIDDEN_PLATFORM_COPY.test(template)).toBe(false);

    const block = template.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
    if (!block) throw new Error("index.html has no application/ld+json block");
    const graph: Array<Record<string, unknown>> = JSON.parse(block)["@graph"];
    if (!Array.isArray(graph)) throw new Error("index.html ld+json has no @graph array");
    const application = graph.find((node) => node["@type"] === "SoftwareApplication");
    if (!application) throw new Error("the ld+json graph has no SoftwareApplication node");
    expect(application.operatingSystem).toBe("Web, Android");
  });

  it("points answer engines at the live Android app in llms.txt", async () => {
    const llms = await readFile(new URL("../../public/llms.txt", import.meta.url), "utf8");
    expect(llms).toContain("https://play.google.com/store/apps/details?id=com.fenzit");
    expect(FORBIDDEN_LAUNCH_COPY.test(llms)).toBe(false);
    expect(FORBIDDEN_PLATFORM_COPY.test(llms)).toBe(false);
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
