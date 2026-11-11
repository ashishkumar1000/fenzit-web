import { describe, expect, test } from "bun:test";
import {
  PRIVACY_LEAD,
  PRIVACY_SECTIONS,
  SECURITY_LEAD,
  SECURITY_SECTIONS,
  TERMS_LEAD,
  TERMS_SECTIONS,
  type LegalSection,
} from "./legalCopy";

const ALL_PAGES: { name: string; lead: string; sections: LegalSection[] }[] = [
  { name: "privacy", lead: PRIVACY_LEAD, sections: PRIVACY_SECTIONS },
  { name: "terms", lead: TERMS_LEAD, sections: TERMS_SECTIONS },
  { name: "security", lead: SECURITY_LEAD, sections: SECURITY_SECTIONS },
];

/** The one paragraph in the privacy policy that contains `marker`. Fails if there is not exactly one. */
function paragraphWith(marker: string): string {
  const hits = PRIVACY_SECTIONS.flatMap((s) => s.paragraphs).filter((p) => p.includes(marker));
  expect(hits.length).toBe(1);
  return hits[0] ?? "";
}

/** The section with this id. Fails with a clear message if the id is wrong. */
function sectionWithId(id: string): LegalSection {
  const section = PRIVACY_SECTIONS.find((s) => s.id === id);
  expect(section).toBeDefined();
  return section as LegalSection;
}

describe("legal copy: user-facing terminology", () => {
  test("no legal page, lead or section says Technician, in any case", () => {
    for (const page of ALL_PAGES) {
      expect(page.lead.toLowerCase()).not.toContain("technician");
      for (const section of page.sections) {
        expect(section.title.toLowerCase()).not.toContain("technician");
        for (const p of section.paragraphs) {
          expect(p.toLowerCase()).not.toContain("technician");
        }
      }
    }
  });
});

describe("privacy policy: invite SMS disclosure", () => {
  test("the collection paragraph names the name, phone number and role collected by an invite", () => {
    const p = paragraphWith("invites someone to Fenzit");
    expect(p).toContain("name, phone number and the role");
    expect(p).toContain("one SMS with a link to download the app");
  });

  test("the masked record paragraph shows the masked example and never a full number", () => {
    const p = paragraphWith("For each invite SMS we keep a record with the phone number masked");
    expect(p).toContain("+91 ******3210");
    expect(p.toLowerCase()).not.toContain("full number");
    expect(p.toLowerCase()).not.toContain("raw number");
  });

  test("the counting code is described as scrambled and unreadable, not as a stored number", () => {
    const p = paragraphWith("scrambled code of the number");
    expect(p).toContain("cannot read back");
    expect(p).not.toMatch(/keep (the |your )?full/i);
  });

  test("MSG91 is named as the provider of the invite SMS in the sharing section", () => {
    const share = sectionWithId("share-title");
    const text = share.paragraphs.join(" ");
    expect(text).toContain("MSG91");
    expect(text).toContain("invite SMS");
  });

  test("the role example lists employee, admin and viewer", () => {
    expect(paragraphWith("attached to these events")).toContain("employee, admin or viewer");
  });
});

describe("privacy policy: retention periods, each on its own record", () => {
  test("invite SMS records are kept 12 months from creation, and that line makes no 24-hour claim", () => {
    const p = paragraphWith("Invite SMS records");
    expect(p).toContain("deleted 12 months after they are created");
    expect(p).not.toContain("24 hours");
  });

  test("scrambled counting codes are kept 24 hours from creation, and that line makes no 12-month claim", () => {
    const p = paragraphWith("scrambled codes used to limit invite SMS");
    expect(p).toContain("deleted 24 hours after they are created");
    expect(p).not.toContain("12 months");
  });

  test("both retention lines sit in the keep-it section", () => {
    const keep = sectionWithId("keep-title").paragraphs.join(" ");
    expect(keep).toContain("deleted 12 months after they are created");
    expect(keep).toContain("deleted 24 hours after they are created");
  });
});

describe("legal pages: dates and structure", () => {
  test("every legal lead shows the same updated date", () => {
    for (const page of ALL_PAGES) {
      expect(page.lead).toContain("Last updated 10 November 2026.");
    }
  });

  test("every section on every legal page has a title, at least one paragraph, and no blank text", () => {
    for (const page of ALL_PAGES) {
      expect(page.sections.length).toBeGreaterThan(0);
      for (const section of page.sections) {
        expect(section.title.trim().length).toBeGreaterThan(0);
        expect(section.paragraphs.length).toBeGreaterThan(0);
        for (const p of section.paragraphs) {
          expect(p.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  test("section ids are unique within each legal page", () => {
    for (const page of ALL_PAGES) {
      const ids = page.sections.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});
