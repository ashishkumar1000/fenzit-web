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
  // prerendered page renders as a live product on both app stores — no early-access
  // remnant and no "coming soon" claim, because both are untrue today. The list
  // mirrors the prerender script's own page list, so a new page joins automatically.
  // (The 2026-11-10 owner decision that let /app/download say the iOS app was coming
  // soon ended when the App Store listing went live, 2026-11-25.)
  it("renders no stale launch copy into any prerendered page, and both store links on the download page", async () => {
    for (const path of ["/", ...PUBLIC_PAGES.map((page) => page.path)]) {
      const html = await renderPage(path);
      expect(
        /early access|waitlist|launching 2026|coming soon/i.test(html),
        `stale launch copy on ${path}`,
      ).toBe(false);
    }

    const download = await renderPage("/app/download");
    expect(download).toContain("https://play.google.com/store/apps/details?id=com.fenzit");
    expect(download).toContain("https://apps.apple.com/app/id6838286809");
  });

  // The FAQ answers are plain copy a rewrite could strip back to one store while the
  // badges still say both — pin the both-stores wording in the prerendered HTML.
  it("names both stores in the FAQ answers on home and attendance", async () => {
    for (const path of ["/", "/attendance"]) {
      const html = await renderPage(path);
      expect(html, `dual-store FAQ copy on ${path}`).toContain("iPhone from the App Store");
    }
  });
});
