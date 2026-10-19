import { describe, expect, it } from "bun:test";
import { renderPage } from "./entry-server";

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
});
