import { describe, expect, it } from "bun:test";
import { PUBLIC_PAGES } from "../../../app/pageMeta";
import { ALL_USE_CASE_CONTENT, siblingsFor } from "./registry";

// The registry and the page-meta list are hand-edited data that must stay in lockstep: the
// routes render from the registry while the prerender, sitemap and speculationrules walk
// PUBLIC_PAGES, so a page added to one and not the other would ship a footer link to the 404
// shell or a silent sitemap gap with every other check green. The copy checks pin the 20
// separately written content files against copy-paste drift.

const REGISTRY_PATHS = ALL_USE_CASE_CONTENT.map((content) => content.meta.path);
const PUBLIC_USE_CASE_PATHS = PUBLIC_PAGES.map((page) => page.path).filter(
  (path) => path !== "/features" && path !== "/attendance",
);

describe("use-case registry", () => {
  it("enumerates exactly the use-case pages of PUBLIC_PAGES, in the same order", () => {
    expect(REGISTRY_PATHS).toEqual(PUBLIC_USE_CASE_PATHS);
  });

  it("has no duplicate paths in PUBLIC_PAGES", () => {
    const paths = PUBLIC_PAGES.map((page) => page.path);
    expect(paths.filter((path, index) => paths.indexOf(path) !== index)).toEqual([]);
  });

  it("keeps every page's heading distinct", () => {
    const headings = ALL_USE_CASE_CONTENT.map((content) => content.heading);
    expect(headings.filter((heading, index) => headings.indexOf(heading) !== index)).toEqual([]);
  });

  it("keeps every page's lead distinct", () => {
    const leads = ALL_USE_CASE_CONTENT.map((content) => content.lead);
    expect(leads.filter((lead, index) => leads.indexOf(lead) !== index)).toEqual([]);
  });

  it("keeps every page's short label distinct", () => {
    const labels = ALL_USE_CASE_CONTENT.map((content) => content.shortLabel);
    expect(labels.filter((label, index) => labels.indexOf(label) !== index)).toEqual([]);
  });

  it("keeps every page's meta title and description distinct", () => {
    const titles = ALL_USE_CASE_CONTENT.map((content) => content.meta.title);
    expect(titles.filter((title, index) => titles.indexOf(title) !== index)).toEqual([]);
    const descriptions = ALL_USE_CASE_CONTENT.map((content) => content.meta.description);
    expect(descriptions.filter((text, index) => descriptions.indexOf(text) !== index)).toEqual([]);
  });

  it("derives four sibling links per page that exclude the page itself", () => {
    for (const content of ALL_USE_CASE_CONTENT) {
      const siblings = siblingsFor(content.meta.path);
      expect(siblings).toHaveLength(4);
      expect(siblings.map((sibling) => sibling.to)).not.toContain(content.meta.path);
      for (const sibling of siblings) {
        const target = ALL_USE_CASE_CONTENT.find((page) => page.meta.path === sibling.to);
        if (!target) throw new Error(`sibling ${sibling.to} is not in the registry`);
        expect(sibling.label).toBe(target.shortLabel);
      }
    }
  });

  it("carries no region markers in any page copy", () => {
    // Fenzit is built for everyone: a revert to "Indian teams" or similar must fail here, not
    // ship. The sign-in flow's honest +91 constraint lives in the login feature, not copy.
    for (const content of ALL_USE_CASE_CONTENT) {
      const copy = [
        content.heading,
        content.lead,
        ...content.problem,
        ...content.steps.map((step) => `${step.title} ${step.text}`),
        ...content.faq.map((item) => `${item.question} ${item.answer}`),
      ].join(" ");
      expect(/india/i.test(copy)).toBe(false);
    }
  });
});
