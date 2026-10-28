import { describe, expect, it } from "bun:test";
import { PRICING_PAGE } from "../../app/pageMeta";
import { PERKS, PLANS, PRICING_FAQ, TRIAL_FEATURES, TRIAL_STEPS } from "./pricingContent";

// Every feature line must be something the app does today. These terms name features we do not
// have, so none of them may reappear in the copy.
const NOT_BUILT = [
  /telemat/i,
  /payroll/i,
  /overtime/i,
  /route/i,
  /csv/i,
  /\bERP\b/,
  /\bSSO\b/,
  /\bSLA\b/,
  /webhook/i,
];

function allVisibleText(): string[] {
  return [
    ...PERKS.flatMap((perk) => [perk.title, perk.detail]),
    ...TRIAL_FEATURES,
    ...TRIAL_STEPS.flatMap((step) => [step.badge, step.title, step.body, step.footer]),
    ...PLANS.flatMap((plan) => [plan.name, plan.users, plan.summary, plan.cta, ...plan.features]),
    ...PRICING_FAQ.flatMap((entry) => [entry.question, entry.answer]),
  ];
}

describe("pricing copy", () => {
  it("names no feature the app does not have", () => {
    for (const text of allVisibleText()) {
      for (const term of NOT_BUILT) {
        expect(text).not.toMatch(term);
      }
    }
  });

  it("uses 90 days, not 3 months, for the trial", () => {
    for (const text of allVisibleText()) {
      expect(text).not.toMatch(/3 months/i);
    }
  });

  it("says 90 days in the page title and description, not 3 months", () => {
    expect(PRICING_PAGE.title).toMatch(/90 days/);
    expect(PRICING_PAGE.description).toMatch(/90 days/);
    expect(PRICING_PAGE.title).not.toMatch(/3 months/i);
    expect(PRICING_PAGE.description).not.toMatch(/3 months/i);
  });

  it("gives every plan exactly one highlighted tier, the middle one", () => {
    expect(PLANS.filter((plan) => plan.highlighted).map((plan) => plan.key)).toEqual(["growth"]);
  });

  it("has a non-empty question and answer for every FAQ entry, with unique keys", () => {
    const keys = PRICING_FAQ.map((entry) => entry.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const entry of PRICING_FAQ) {
      expect(entry.question.trim().length).toBeGreaterThan(0);
      expect(entry.answer.trim().length).toBeGreaterThan(0);
    }
  });
});
