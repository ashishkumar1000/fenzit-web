import { describe, expect, it } from "bun:test";
import { readAttendanceFilters } from "./adminBrowseLoaders";
import { ATTENDANCE_NO_OFFICE, ATTENDANCE_PATH, attendanceUrl } from "./attendanceUrl";

// The attendance address is the month table's whole filter state: a bad or
// hand-edited address falls back to defaults, and every filter change
// restarts at page 1 so the owner never lands on an empty page of the new
// view. The filters are client-side (the roster arrives whole), so the URL
// is state, not a fetch contract.

const DEFAULTS = {
  chip: "",
  office: "",
  sort: "absent",
  page: 1,
  pageSize: 10,
} as const;

function parse(query: string): ReturnType<typeof readAttendanceFilters> {
  return readAttendanceFilters(new URLSearchParams(query));
}

describe("attendanceUrl: building the address", () => {
  it("leaves every default out, so the plain page has a bare address", () => {
    expect(attendanceUrl({ ...DEFAULTS, page: 1, pageSize: 10 }, {})).toBe(ATTENDANCE_PATH);
  });

  it("restarts at page 1 when a filter changes, even from a deep page", () => {
    const deep = { ...DEFAULTS, page: 7 };
    const url = new URL(`http://localhost${attendanceUrl(deep, { chip: "absent" })}`);
    expect(url.searchParams.get("chip")).toBe("absent");
    expect(url.searchParams.has("page")).toBe(false);
  });

  it("keeps the other filters when the page changes", () => {
    const current = { ...DEFAULTS, chip: "late" as const, office: "Andheri", page: 3 };
    const url = new URL(`http://localhost${attendanceUrl(current, { page: 2 })}`);
    expect(url.searchParams.get("chip")).toBe("late");
    expect(url.searchParams.get("office")).toBe("Andheri");
    expect(url.searchParams.get("page")).toBe("2");
  });

  it("omits the default sort instead of sending sort=absent", () => {
    expect(attendanceUrl({ ...DEFAULTS, page: 1, pageSize: 10 }, {})).not.toContain("sort=");
  });

  it("carries the name sort and the no-office sentinel", () => {
    const url = attendanceUrl(
      { ...DEFAULTS, page: 1, pageSize: 10 },
      { sort: "az", office: ATTENDANCE_NO_OFFICE },
    );
    const params = new URL(`http://localhost${url}`).searchParams;
    expect(params.get("sort")).toBe("az");
    expect(params.get("office")).toBe("__none__");
  });

  it("reads back exactly the filters it wrote", () => {
    const chosen = {
      chip: "present" as const,
      office: "Andheri",
      sort: "az" as const,
      page: 4,
      pageSize: 50,
    };
    const address = attendanceUrl({ ...DEFAULTS, ...chosen }, { page: chosen.page });
    expect(parse(address.slice(ATTENDANCE_PATH.length + 1))).toEqual(chosen);
  });
});

describe("readAttendanceFilters: reading the address", () => {
  it("returns the defaults for a bare address", () => {
    expect(parse("")).toEqual({ ...DEFAULTS, page: 1, pageSize: 10 });
  });

  it.each([
    ["0", 1],
    ["-3", 1],
    ["2.5", 1],
    ["abc", 1],
    ["", 1],
    ["9", 9],
    ["10001", 10000],
  ])("reads page=%s as %s", (raw, expected) => {
    expect(parse(`page=${raw}`).page).toBe(expected);
  });

  it.each([
    ["10", 10],
    ["25", 25],
    ["50", 50],
    ["11", 10],
    ["abc", 10],
  ])("reads pageSize=%s as %s (only 10, 25 and 50 are accepted)", (raw, expected) => {
    expect(parse(`pageSize=${raw}`).pageSize).toBe(expected);
  });

  it("falls back to All for an unknown chip, and to Most absent for an unknown sort", () => {
    const filters = parse("chip=vacation&sort=shake");
    expect(filters.chip).toBe("");
    expect(filters.sort).toBe("absent");
  });

  it("trims the office and caps it at 120 characters", () => {
    expect(parse("office=%20%20Andheri%20%20").office).toBe("Andheri");
    const long = "x".repeat(140);
    expect(parse(`office=${long}`).office).toHaveLength(120);
  });

  it("keeps a hand-typed office name as-is (the row set decides what it filters)", () => {
    expect(parse("office=Nowhere%20Branch").office).toBe("Nowhere Branch");
  });
});
