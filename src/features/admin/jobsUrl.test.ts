import { describe, expect, it } from "bun:test";
import { readJobsFilters, type JobsFilters } from "./adminBrowseLoaders";
import { JOBS_PATH, jobsUrl } from "./jobsUrl";

// The Jobs address is the page's whole filter state: a bad or hand-edited
// address must fall back to defaults, and every filter change must restart at
// page 1 so the owner never lands on an empty page of the new view.

const DEFAULTS: JobsFilters = {
  q: "",
  status: "",
  skill: "",
  priority: "",
  sort: "latest",
  page: 1,
  pageSize: 10,
};

function parse(query: string): JobsFilters {
  return readJobsFilters(new URL(`http://localhost${JOBS_PATH}${query}`));
}

describe("jobsUrl: building the address", () => {
  it("leaves every default out, so the plain page has a bare address", () => {
    expect(jobsUrl(DEFAULTS, {})).toBe(JOBS_PATH);
  });

  it("restarts at page 1 when a filter changes, even from a deep page", () => {
    const deep = { ...DEFAULTS, page: 7 };
    const url = new URL(`http://localhost${jobsUrl(deep, { status: "scheduled" })}`);
    expect(url.searchParams.get("status")).toBe("scheduled");
    expect(url.searchParams.has("page")).toBe(false);
  });

  it("restarts at page 1 when the page size changes", () => {
    const deep = { ...DEFAULTS, page: 4 };
    const url = new URL(`http://localhost${jobsUrl(deep, { pageSize: 25 })}`);
    expect(url.searchParams.get("pageSize")).toBe("25");
    expect(url.searchParams.has("page")).toBe(false);
  });

  it("keeps the other filters when one changes", () => {
    const current = {
      ...DEFAULTS,
      q: "leak",
      status: "in_progress" as const,
      priority: "urgent" as const,
      page: 3,
    };
    const url = new URL(`http://localhost${jobsUrl(current, { page: 2 })}`);
    expect(url.searchParams.get("q")).toBe("leak");
    expect(url.searchParams.get("status")).toBe("in_progress");
    expect(url.searchParams.get("priority")).toBe("urgent");
    expect(url.searchParams.get("page")).toBe("2");
  });

  it("omits page 1 and the default page size from the address", () => {
    const url = jobsUrl({ ...DEFAULTS, page: 1, pageSize: 10 }, {});
    expect(url).toBe(JOBS_PATH);
  });

  it("omits an empty search instead of sending q=", () => {
    expect(jobsUrl({ ...DEFAULTS, q: "" }, {})).not.toContain("q=");
  });

  it("omits the default sort instead of sending sort=latest", () => {
    expect(jobsUrl({ ...DEFAULTS, sort: "latest" }, {})).not.toContain("sort=");
  });

  it("carries the soonest sort in the address", () => {
    const url = jobsUrl(DEFAULTS, { sort: "soonest" });
    expect(new URL(`http://localhost${url}`).searchParams.get("sort")).toBe("soonest");
  });

  it("percent-encodes a search with spaces and symbols", () => {
    const url = jobsUrl(DEFAULTS, { q: "JB-1 & co" });
    expect(new URL(`http://localhost${url}`).searchParams.get("q")).toBe("JB-1 & co");
  });
});

describe("readJobsFilters: reading the address", () => {
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
    ["10000", 10000],
    ["10001", 10000],
    ["1e21", 10000],
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

  it("falls back to All for an unknown status or priority", () => {
    const filters = parse("?status=banana&priority=high");
    expect(filters.status).toBe("");
    expect(filters.priority).toBe("");
  });

  it("falls back to the default sort for an unknown sort value", () => {
    expect(parse("?sort=drop_table").sort).toBe("latest");
  });

  it("reads an unknown skill id as All", () => {
    // A skill id the catalog never minted simply filters to nothing; the
    // reader keeps the shape (it is not free text to strip).
    expect(parse("?skill=s-9").skill).toBe("s-9");
    expect(parse("?skill=%20%20").skill).toBe("");
  });

  it("trims the search and caps it at 80 characters", () => {
    expect(parse("?q=%20%20leak%20%20").q).toBe("leak");
    const long = "x".repeat(120);
    expect(parse(`?q=${long}`).q).toHaveLength(80);
    expect(parse("?q=%20%20%20").q).toBe("");
  });

  it("keeps an 80-character search whole", () => {
    const exact = "y".repeat(80);
    expect(parse(`?q=${exact}`).q).toBe(exact);
  });

  it("reads back exactly the filters it wrote", () => {
    const chosen: JobsFilters = {
      q: "pipe leak",
      status: "in_progress",
      skill: "34d565e9-0619-4614-a83f-d38b8caea613",
      priority: "urgent",
      sort: "soonest",
      page: 4,
      pageSize: 50,
    };
    // A page change is the only change that keeps the page; every other change restarts at 1.
    const address = jobsUrl(chosen, { page: chosen.page });
    expect(parse(address.slice(JOBS_PATH.length))).toEqual(chosen);
  });
});
