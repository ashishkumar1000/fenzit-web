import { describe, expect, it } from "bun:test";
import { fmtDayMonth, waitLabel } from "./format";

// The wait label a person reads: hours under a day, whole days after — with
// the day count floored, so 36 hours never reads as the two days it has not
// finished being.

describe("waitLabel: the day boundary and the floor", () => {
  it.each([
    [0, "<1 h"],
    [0.5, "<1 h"],
    [1, "1 h"],
    [23, "23 h"],
    [24, "1 d"],
    [25, "1 d"],
    [36, "1 d"],
    [47.9, "1 d"],
    [48, "2 d"],
    [72, "3 d"],
  ])("%s hours reads as %s", (hours, label) => {
    expect(waitLabel(hours)).toBe(label);
  });
});

describe("fmtDayMonth: the card pill's literal shape", () => {
  // Pinned literally — a formatter change must be a reviewed choice, not a
  // test that recomputes the same wrong string (BMAD review 2026-11-28).
  it("reads 2026-01-01 as 1 Jan", () => {
    expect(fmtDayMonth("2026-01-01")).toBe("1 Jan");
  });
  it("reads a mid-month day as day + short month", () => {
    expect(fmtDayMonth("2026-11-28")).toBe("28 Nov");
  });
  it("reads the raw ISO day when the date is not parseable", () => {
    expect(fmtDayMonth("not-a-date")).toBe("not-a-date");
  });
});
