import { describe, expect, it } from "bun:test";
import { hasWeeklyOff, icsFor, isWeeklyOffDate, longWeekends } from "./holidaysMath";
import type { HolidayRow } from "./companyApi";

/**
 * Pins the November 2026 incident (owner report 2026-11-26): the weekly-off
 * days array is ISO (1=Mon..7=Sun, the attendance engine's convention), and
 * a holiday swallowed whole by the weekly off is NOT a long weekend — a
 * break counts only when a holiday adds a day the weekly off alone
 * wouldn't give.
 */

/** The dummy tenant's real shape since the 2026-11-26 normalization:
 *  Sunday-only weekly off, holidays on Nov 8/12/28/30. */
const TENANT_NOV_2026 = {
  defaults: [{ valid: "[2026-10-01,)", days: [7] }],
  holidays: [
    { id: "h-diwali", date: "2026-11-08", name: "Diwali", scope: "all" }, // Sunday — swallowed
    { id: "h-newyear", date: "2026-11-12", name: "New Year", scope: "all" }, // Thursday — lone day
    { id: "h-dummy-1", date: "2026-11-28", name: "Dummy Holiday 1", scope: "all" }, // Saturday
    { id: "h-dummy-2", date: "2026-11-30", name: "Dummy Holiday 2", scope: "all" }, // Monday
  ] as HolidayRow[],
};

describe("longWeekends", () => {
  it("November 2026 = exactly ONE break: Sat 28 + Sun weekly off + Mon 30", () => {
    const found = longWeekends(TENANT_NOV_2026.holidays, TENANT_NOV_2026.defaults, "2026");
    expect(found).toEqual([
      {
        holidays: [
          { id: "h-dummy-1", date: "2026-11-28", name: "Dummy Holiday 1", scope: "all" },
          { id: "h-dummy-2", date: "2026-11-30", name: "Dummy Holiday 2", scope: "all" },
        ],
        label: "3 Days Off",
        start: "2026-11-28",
        end: "2026-11-30",
      },
    ]);
  });

  it("a holiday ON the weekly off adds nothing — a swallowed-holiday run is not a long weekend", () => {
    // Only Diwali: it falls on the Sunday weekly off, so the "break" is the
    // regular weekend — nothing to plan around.
    const found = longWeekends(
      [{ id: "h-diwali", date: "2026-11-08", name: "Diwali", scope: "all" }],
      TENANT_NOV_2026.defaults,
      "2026",
    );
    expect(found).toEqual([]);
  });

  it("a midweek holiday bridging a Fri–Sun weekly off counts (the old dummy config's New Year case)", () => {
    // The config that triggered the owner's "how is Thu–Sun a long weekend?"
    // question: Fri+Sat+Sun weekly off makes ANY Thursday holiday a 4-day
    // break. Math is right — the config was the surprise.
    const friSunOff = [{ valid: "[2026-10-01,)", days: [5, 6, 7] }];
    const found = longWeekends(
      [{ id: "h-newyear", date: "2026-11-12", name: "New Year", scope: "all" }],
      friSunOff,
      "2026",
    );
    expect(found).toEqual([
      {
        holidays: [{ id: "h-newyear", date: "2026-11-12", name: "New Year", scope: "all" }],
        label: "4 Days Off",
        start: "2026-11-12",
        end: "2026-11-15",
      },
    ]);
  });

  it("a tenant with no weekly off gets no long weekends at all", () => {
    const found = longWeekends(
      [{ id: "h-mon", date: "2026-11-30", name: "Solo", scope: "all" }],
      [{ valid: "[2026-01-01,)", days: [] }],
      "2026",
    );
    expect(found).toEqual([]);
    expect(hasWeeklyOff([{ valid: "[2026-01-01,)", days: [] }], "2026")).toBe(false);
    expect(hasWeeklyOff(TENANT_NOV_2026.defaults, "2026")).toBe(true);
  });

  it("hasWeeklyOff is year-scoped — a weekly off removed before the year does not summon the section", () => {
    // Sunday off through 2026 only; 2027 has no weekly off at all.
    const defaults = [
      { valid: "[2026-10-01,2027-01-01)", days: [7] },
      { valid: "[2027-01-01,)", days: [] },
    ];
    expect(hasWeeklyOff(defaults, "2026")).toBe(true);
    expect(hasWeeklyOff(defaults, "2027")).toBe(false);
    // And the finder agrees — 2027 gets no long weekends even with a
    // 3-holiday run, because the section itself doesn't exist for them.
    const found = longWeekends(
      [
        { id: "h-1", date: "2027-03-03", name: "One", scope: "all" },
        { id: "h-2", date: "2027-03-04", name: "Two", scope: "all" },
        { id: "h-3", date: "2027-03-05", name: "Three", scope: "all" },
      ],
      defaults,
      "2027",
    );
    expect(found).toEqual([]);
  });

  it("runs glued only by holidays of disjoint office scopes serve nobody end-to-end", () => {
    // Sun weekly off; Sat holiday for office A, Sun for office B, Mon for
    // office A → the Sat–Mon run never fully applies to one office.
    const found = longWeekends(
      [
        { id: "h-a", date: "2026-11-28", name: "A day", scope: "offices", officeIds: ["office-a"] },
        { id: "h-b", date: "2026-11-29", name: "B day", scope: "offices", officeIds: ["office-b"] },
        {
          id: "h-c",
          date: "2026-11-30",
          name: "A again",
          scope: "offices",
          officeIds: ["office-a"],
        },
      ],
      TENANT_NOV_2026.defaults,
      "2026",
    );
    expect(found).toEqual([]);
  });

  it("a Dec 31 holiday runs past the year edge (right-pad scan)", () => {
    const friSunOff = [{ valid: "[2026-01-01,)", days: [5, 6, 7] }]; // Fri+Sat+Sun
    const found = longWeekends(
      [{ id: "h-eve", date: "2026-12-31", name: "New Year's Eve", scope: "all" }], // Thursday
      friSunOff,
      "2026",
    );
    expect(found).toEqual([
      {
        holidays: [{ id: "h-eve", date: "2026-12-31", name: "New Year's Eve", scope: "all" }],
        label: "4 Days Off",
        start: "2026-12-31",
        end: "2027-01-03",
      },
    ]);
  });
});

describe("isWeeklyOffDate", () => {
  const defaults = [{ valid: "[2026-10-01,)", days: [7] }];

  it("matches the weekly-off weekday (Sunday stored as ISO 7, not JS 0)", () => {
    expect(isWeeklyOffDate(defaults, "2026-11-08")).toBe(true); // Sunday
    expect(isWeeklyOffDate(defaults, "2026-11-09")).toBe(false); // Monday
  });

  it("respects the validity range", () => {
    expect(isWeeklyOffDate(defaults, "2026-09-27")).toBe(false); // Sunday before the default began
  });

  it("a later empty-days row switches the weekly off off", () => {
    const ended = [...defaults, { valid: "[2026-11-15,)", days: [] }];
    expect(isWeeklyOffDate(ended, "2026-11-08")).toBe(true); // before the switch-off
    expect(isWeeklyOffDate(ended, "2026-11-22")).toBe(false); // Sunday after it
  });
});

describe("icsFor (the Export Calendar output)", () => {
  const stamp = new Date(Date.UTC(2026, 10, 26, 6, 30, 0));

  it("wraps one all-day event per holiday with the exclusive next-day DTEND", () => {
    const ics = icsFor(
      [{ id: "h1", date: "2026-10-02", name: "Gandhi Jayanti", scope: "all", officeIds: [] }],
      stamp,
    );
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("UID:h1@holidays.fenzit.com");
    expect(ics).toContain("DTSTAMP:20261126T063000Z");
    expect(ics).toContain("DTSTART;VALUE=DATE:20261002");
    expect(ics).toContain("DTEND;VALUE=DATE:20261003");
    expect(ics).toContain("END:VCALENDAR");
  });

  it("escapes the ICS specials in names and descriptions", () => {
    const ics = icsFor(
      [
        {
          id: "h2",
          date: "2026-12-25",
          name: "Christmas; the 'big' one, maybe",
          description: "Line one\\Line two",
          scope: "all",
          officeIds: [],
        },
      ],
      stamp,
    );
    expect(ics).toContain("SUMMARY:Christmas\\; the 'big' one\\, maybe");
    expect(ics).toContain("DESCRIPTION:Line one\\\\Line two");
  });
});
