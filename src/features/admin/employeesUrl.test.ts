import { describe, expect, it } from "bun:test";
import { readEmployeesFilters, type EmployeesFilters } from "./adminBrowseLoaders";
import { EMPLOYEES_PATH, employeesUrl } from "./employeesUrl";

// The Employees address is the page's whole filter state: a bad or hand-edited
// address must fall back to defaults, and every filter change must restart at
// page 1 so the owner never lands on an empty page of the new view.

const DEFAULTS: EmployeesFilters = {
  q: "",
  status: "all",
  role: "all",
  jobSetting: "all",
  sort: "joined_new",
  page: 1,
  pageSize: 10,
};

function parse(query: string): EmployeesFilters {
  return readEmployeesFilters(new URL(`http://localhost${EMPLOYEES_PATH}${query}`));
}

describe("employeesUrl: building the address", () => {
  it("leaves every default out, so the plain page has a bare address", () => {
    expect(employeesUrl(DEFAULTS, {})).toBe(EMPLOYEES_PATH);
  });

  it("restarts at page 1 when a filter changes, even from a deep page", () => {
    const deep = { ...DEFAULTS, page: 7 };
    const url = new URL(`http://localhost${employeesUrl(deep, { status: "active" })}`);
    expect(url.searchParams.get("status")).toBe("active");
    expect(url.searchParams.has("page")).toBe(false);
  });

  it("restarts at page 1 when the page size changes", () => {
    const deep = { ...DEFAULTS, page: 4 };
    const url = new URL(`http://localhost${employeesUrl(deep, { pageSize: 25 })}`);
    expect(url.searchParams.get("pageSize")).toBe("25");
    expect(url.searchParams.has("page")).toBe(false);
  });

  it("keeps the other filters when one changes", () => {
    const current = { ...DEFAULTS, q: "asha", role: "employee" as const, page: 3 };
    const url = new URL(`http://localhost${employeesUrl(current, { page: 2 })}`);
    expect(url.searchParams.get("q")).toBe("asha");
    expect(url.searchParams.get("role")).toBe("employee");
    expect(url.searchParams.get("page")).toBe("2");
  });

  it("omits page 1 and the default page size from the address", () => {
    const url = employeesUrl({ ...DEFAULTS, page: 1, pageSize: 10 }, {});
    expect(url).toBe(EMPLOYEES_PATH);
  });

  it("omits an empty search instead of sending q=", () => {
    expect(employeesUrl({ ...DEFAULTS, q: "" }, {})).not.toContain("q=");
  });

  it("percent-encodes a search with spaces and symbols", () => {
    const url = employeesUrl(DEFAULTS, { q: "Asha V & co" });
    expect(new URL(`http://localhost${url}`).searchParams.get("q")).toBe("Asha V & co");
  });
});

describe("readEmployeesFilters: reading the address", () => {
  it("returns the defaults for a bare address", () => {
    expect(parse("")).toEqual(DEFAULTS);
  });

  it.each([
    ["0", 1],
    ["-3", 1],
    ["2.5", 1],
    ["abc", 1],
    ["", 1],
    ["1", 1],
    ["9", 9],
  ])("reads page=%s as %s", (raw, expected) => {
    expect(parse(`?page=${raw}`).page).toBe(expected);
  });

  it.each([
    ["10", 10],
    ["25", 25],
    ["50", 50],
    ["11", 10],
    ["100", 10],
    ["abc", 10],
    ["", 10],
  ])("reads pageSize=%s as %s (only 10, 25 and 50 are accepted)", (raw, expected) => {
    expect(parse(`?pageSize=${raw}`).pageSize).toBe(expected);
  });

  it("falls back to all for an unknown status, role or job setting", () => {
    const filters = parse("?status=deleted&role=owner&jobSetting=anything");
    expect(filters.status).toBe("all");
    expect(filters.role).toBe("all");
    expect(filters.jobSetting).toBe("all");
  });

  it("falls back to the default sort for an unknown sort value", () => {
    expect(parse("?sort=drop_table").sort).toBe("joined_new");
  });

  it("trims the search and caps it at 80 characters", () => {
    expect(parse("?q=%20%20asha%20%20").q).toBe("asha");
    const long = "x".repeat(120);
    expect(parse(`?q=${long}`).q).toHaveLength(80);
    expect(parse("?q=%20%20%20").q).toBe("");
  });

  it("keeps an 80-character search whole", () => {
    const exact = "y".repeat(80);
    expect(parse(`?q=${exact}`).q).toBe(exact);
  });

  it("reads back exactly the filters it wrote", () => {
    const chosen: EmployeesFilters = {
      q: "chitra d",
      status: "invited",
      role: "company_admin",
      jobSetting: "approval",
      sort: "code_za",
      page: 4,
      pageSize: 50,
    };
    // A page change is the only change that keeps the page; every other change restarts at 1.
    const address = employeesUrl(chosen, { page: chosen.page });
    expect(parse(address.slice(EMPLOYEES_PATH.length))).toEqual(chosen);
  });
});
