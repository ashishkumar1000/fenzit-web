import { describe, expect, it } from "bun:test";
import type { LeaveRow } from "./companyApi";
import {
  dayNumberOf,
  groupApprovedByDate,
  isMonth,
  monthBounds,
  monthCells,
  monthLabel,
  nextWorkingDay,
  shortDay,
  shortRange,
  shiftMonth,
  weekdayOf,
} from "./leaveDateMath";

// The calendar tab's pure date math. 2026-11 is the fixture month: the 1st
// is a Sunday, the 24th a Tuesday, the 27th a Friday, the 28th a Saturday.

describe("leaveDateMath: months", () => {
  it("bounds a month to its first and last day — the 27-1 window", () => {
    expect(monthBounds("2026-11")).toEqual({ from: "2026-11-01", to: "2026-11-30" });
    expect(monthBounds("2026-12")).toEqual({ from: "2026-12-01", to: "2026-12-31" });
    expect(monthBounds("2026-02")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(monthBounds("2028-02")).toEqual({ from: "2028-02-01", to: "2028-02-29" });
  });

  it("lays out Sunday-first grid cells with leading blanks (2026-11 starts on a Sunday)", () => {
    const cells = monthCells("2026-11");
    // No lead: the 1st is already a Sunday; 30 real days follow.
    expect(cells[0]).toEqual({ date: "2026-11-01", day: 1 });
    expect(cells.filter((cell) => cell === null)).toHaveLength(0);
    expect(cells[29]).toEqual({ date: "2026-11-30", day: 30 });
    expect(cells).toHaveLength(30);
  });

  it("pads the first week and rolls over December's 31 days", () => {
    // 2026-12-01 is a Tuesday — two blanks, then 31 days.
    const cells = monthCells("2026-12");
    expect(cells.slice(0, 2)).toEqual([null, null]);
    expect(cells[2]).toEqual({ date: "2026-12-01", day: 1 });
    expect(cells).toHaveLength(2 + 31);
    expect(cells[32]).toEqual({ date: "2026-12-31", day: 31 });
    // A non-leap February stays at 28.
    expect(monthCells("2027-02")).toHaveLength(1 + 28);
  });

  it("shifts months across year edges", () => {
    expect(shiftMonth("2026-11", -1)).toBe("2026-10");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });

  it("accepts only real YYYY-MM months", () => {
    expect(isMonth("2026-11")).toBe(true);
    expect(isMonth("2026-13")).toBe(false);
    expect(isMonth("2026-00")).toBe(false);
    expect(isMonth("2026-1")).toBe(false);
    expect(isMonth("nov")).toBe(false);
    expect(isMonth("")).toBe(false);
  });

  it("labels a month", () => {
    expect(monthLabel("2026-11")).toBe("November 2026");
  });

  it("names days and spans compactly", () => {
    expect(shortDay("2026-11-17")).toBe("17 Nov");
    expect(shortRange("2026-11-17", "2026-11-20")).toBe("17–20 Nov");
    expect(shortRange("2026-11-28", "2026-12-02")).toBe("28 Nov – 2 Dec");
  });
});

describe("leaveDateMath: weekdays and the return day", () => {
  it("reads Sunday-first weekdays from ISO dates", () => {
    expect(weekdayOf("2026-11-01")).toBe(0); // Sunday
    expect(weekdayOf("2026-11-24")).toBe(2); // Tuesday
    expect(weekdayOf("2026-11-28")).toBe(6); // Saturday
  });

  it("returns the next working day, skipping the weekend", () => {
    expect(nextWorkingDay("2026-11-24")).toBe("2026-11-25"); // Tue → Wed
    expect(nextWorkingDay("2026-11-27")).toBe("2026-11-30"); // Fri → Mon
    expect(nextWorkingDay("2026-11-28")).toBe("2026-11-30"); // Sat → Mon
    expect(nextWorkingDay("2026-11-29")).toBe("2026-11-30"); // Sun → Mon
  });
});

describe("leaveDateMath: the day cells", () => {
  const base: LeaveRow = {
    id: "r-1",
    employeeId: "u-1",
    employeeName: "Asha V",
    startDate: "2026-11-17",
    endDate: "2026-11-20",
    part: "full_day",
    reason: "",
    createdAt: "2026-11-10T00:00:00.000Z",
    status: "approved",
    workingDays: 4,
    totalDays: 4,
    dates: [
      { date: "2026-11-17", state: "approved" },
      { date: "2026-11-18", state: "approved" },
      { date: "2026-11-19", state: "approved" },
      { date: "2026-11-20", state: "approved" },
    ],
  };

  it("numbers a day inside the span 1-based, and 0 outside", () => {
    expect(dayNumberOf(base, "2026-11-18")).toBe(2);
    expect(dayNumberOf(base, "2026-11-17")).toBe(1);
    expect(dayNumberOf(base, "2026-11-21")).toBe(0);
  });

  it("groups approved days into cells and skips non-approved day states", () => {
    const cancelled: LeaveRow = {
      ...base,
      id: "r-2",
      employeeId: "u-2",
      employeeName: "Bunty R",
      dates: [
        { date: "2026-11-17", state: "cancelled" },
        { date: "2026-11-18", state: "approved" },
      ],
    };
    const byDate = groupApprovedByDate([base, cancelled]);
    expect(byDate.get("2026-11-17")?.map((row) => row.id)).toEqual(["r-1"]);
    expect(byDate.get("2026-11-18")?.map((row) => row.id)).toEqual(["r-1", "r-2"]);
    expect(byDate.get("2026-11-20")?.map((row) => row.id)).toEqual(["r-1"]);
    expect(byDate.size).toBe(4);
  });

  it("keeps one entry per request even when the page repeats the row", () => {
    const byDate = groupApprovedByDate([base, base]);
    expect(byDate.get("2026-11-17")?.length).toBe(1);
  });
});
