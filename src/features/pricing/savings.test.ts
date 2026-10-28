import { describe, expect, it } from "bun:test";
import { hoursSavedPerMonth, tierForMembers } from "./savings";
import { PLANS } from "./pricingContent";

describe("tierForMembers", () => {
  it("puts each headcount in the right plan, including the edges of each band", () => {
    expect(tierForMembers(0)).toBe("Starter");
    expect(tierForMembers(5)).toBe("Starter");
    expect(tierForMembers(15)).toBe("Starter");
    expect(tierForMembers(16)).toBe("Growth");
    expect(tierForMembers(75)).toBe("Growth");
    expect(tierForMembers(76)).toBe("Large teams");
    expect(tierForMembers(250)).toBe("Large teams");
  });
});

describe("hoursSavedPerMonth", () => {
  it("returns whole, non-negative hours at the slider ends and the default", () => {
    expect(hoursSavedPerMonth(0)).toBe(0);
    expect(hoursSavedPerMonth(5)).toBe(12);
    expect(hoursSavedPerMonth(25)).toBe(62);
    expect(hoursSavedPerMonth(250)).toBe(620);
    for (const members of [5, 17, 99, 250]) {
      const hours = hoursSavedPerMonth(members);
      expect(Number.isInteger(hours)).toBe(true);
      expect(hours).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("plan user bands and the calculator agree", () => {
  // Each band label on the plan cards must put its edge headcounts in the same tier the
  // calculator uses. "Up to 15" ends at 15, "16 to 75" runs 16 to 75, "76+" starts at 76.
  const BANDS: Array<{ name: string; users: string; low: number; high: number }> = [
    { name: "Starter", users: "Up to 15 users", low: 1, high: 15 },
    { name: "Growth", users: "16 to 75 users", low: 16, high: 75 },
    { name: "Large teams", users: "76+ users", low: 76, high: 250 },
  ];

  it("keeps each band's label and its calculator tier on the same edges", () => {
    const plans = PLANS.map((plan) => plan.users);
    for (const band of BANDS) {
      expect(plans).toContain(band.users);
      expect(tierForMembers(band.low)).toBe(band.name);
      expect(tierForMembers(band.high)).toBe(band.name);
    }
  });
});
