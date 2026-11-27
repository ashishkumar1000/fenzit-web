import { describe, expect, it } from "bun:test";
import { EMPLOYMENT_FIELDS, EMPLOYMENT_SECTIONS, SECTION_FIELDS } from "./employmentSections";

/**
 * The generated contract lists the BE's fields; the section map decides where
 * each one is edited. A field that falls out of both lists silently disappears
 * from the form, so pin the union: every field exactly once.
 */
describe("employment sections", () => {
  it("places every contract field in exactly one section", () => {
    const sectioned = EMPLOYMENT_SECTIONS.flatMap((section) => SECTION_FIELDS[section]);
    expect([...sectioned].sort()).toEqual([...EMPLOYMENT_FIELDS].sort());
    expect(new Set(sectioned).size).toBe(sectioned.length);
  });
});
