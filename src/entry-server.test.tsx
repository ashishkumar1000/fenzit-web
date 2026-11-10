import { describe, expect, it } from "bun:test";
import { renderPage } from "./entry-server";
import { PUBLIC_PAGES } from "./app/pageMeta";

describe("renderPage (build-time HTML)", () => {
  it("puts the home page hero in the HTML, before any JavaScript runs", async () => {
    const html = await renderPage("/");

    expect(html).toContain('id="hero-title"');
    expect(html).toContain("Run your jobs, attendance and leave");
  });

  it("shows India alone in the country list, the same markup the browser shows first", async () => {
    const html = await renderPage("/");

    expect(html).toContain("India (+91)");
    expect(html).not.toContain("United Kingdom (+44)");
  });

  it("renders the features page with its heading", async () => {
    const html = await renderPage("/features");

    expect(html).toContain("For owners");
    expect(html).not.toContain('id="hero-title"');
  });

  // The launch invariant, on the HTML visitors and crawlers actually get: every
  // prerendered page renders as a live Android product — no early-access remnant
  // and no iOS mention, because neither is true today. The list mirrors the
  // prerender script's own page list, so a new page joins automatically.
  // /app/download is the one exception: the invite SMS points iPhone users here, and
  // it must say the iOS app is coming soon. Decision 2026-11-10, owner-approved.
  const IOS_NOTE_ALLOWED = new Set(["/app/download"]);

  it("renders no pre-launch copy or iOS mention into any prerendered page", async () => {
    for (const path of ["/", ...PUBLIC_PAGES.map((page) => page.path)]) {
      const html = await renderPage(path);
      expect(
        /early access|waitlist|launching 2026/i.test(html),
        `forbidden launch copy on ${path}`,
      ).toBe(false);
      if (IOS_NOTE_ALLOWED.has(path)) continue;
      expect(
        /\bios\b|ios\s?\d|iphone|app[\s-]?store/i.test(html),
        `forbidden platform copy on ${path}`,
      ).toBe(false);
    }
  });
});
