import { readFile } from "node:fs/promises";
import { describe, expect, it } from "bun:test";
import { DOWNLOAD_APP_PAGE, PUBLIC_PAGES } from "./pageMeta";

// Site-wide head invariants over hand-edited data: the titles and descriptions must stay
// distinct and inside the display budgets, and the site stays region-neutral — it is built for
// everyone, so a reverted "Indian teams" or an "areaServed": "IN" must fail here, not ship.
// The site is a live product: a reverted "Launching 2026", an early-access remnant, or a
// "coming soon" claim (the iOS app is live) must fail here too.

const FORBIDDEN_LAUNCH_COPY = /early access|waitlist|launching 2026|coming soon/i;

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

  it("carries no pre-launch or coming-soon copy in any title or description", () => {
    for (const page of PUBLIC_PAGES) {
      expect(FORBIDDEN_LAUNCH_COPY.test(`${page.title} ${page.description}`)).toBe(false);
    }
  });

  it("keeps the home template free of stale copy, with both app stores in the structured data", async () => {
    const template = await readFile(new URL("../../index.html", import.meta.url), "utf8");
    expect(FORBIDDEN_LAUNCH_COPY.test(template)).toBe(false);

    const block = template.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
    if (!block) throw new Error("index.html has no application/ld+json block");
    const graph: Array<Record<string, unknown>> = JSON.parse(block)["@graph"];
    if (!Array.isArray(graph)) throw new Error("index.html ld+json has no @graph array");
    const application = graph.find((node) => node["@type"] === "SoftwareApplication");
    if (!application) throw new Error("the ld+json graph has no SoftwareApplication node");
    expect(application.operatingSystem).toBe("Web, Android, iOS");
  });

  it("points answer engines at both live app stores in llms.txt", async () => {
    const llms = await readFile(new URL("../../public/llms.txt", import.meta.url), "utf8");
    expect(llms).toContain("https://play.google.com/store/apps/details?id=com.fenzit");
    expect(llms).toContain("https://apps.apple.com/app/id6838286809");
    expect(FORBIDDEN_LAUNCH_COPY.test(llms)).toBe(false);
  });

  // The search-result description is copy a rewrite could strip back to one store while
  // the badges still say both — pin the both-stores wording where it lives.
  it("names both stores in the download page's search-result description", () => {
    expect(DOWNLOAD_APP_PAGE.description).toContain("or the App Store (iPhone)");
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
