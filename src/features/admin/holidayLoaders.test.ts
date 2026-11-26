import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import {
  adminHolidayAction,
  adminHolidayScheduleLoader,
  adminHolidayUploadLoader,
  adminHolidaysLoader,
} from "./holidayLoaders";
import { clearSession, readSession, writeSession } from "../../services/session";
import { resetIdentityCacheForTests } from "./identityCache";
import {
  clearApiBase,
  installFetchMock,
  jsonResponse,
  restoreFetchMock,
  sentRequests,
  setRespond,
  useApiBase,
} from "../../testing/fetchMock";

// The holidays section's loaders and action: both pages ride ONE overview
// fetch (the year's holidays + the office headcounts), the schedule page adds
// the inspector's impact call ONLY when ?inspect=<date> is open, and the
// upload page adds the whole-calendar list the confirm popup classifies
// against. These tests are the wire contract of that rule — which endpoints
// each address may ask for, how a dead slice degrades, and what the action
// ships for each of the modal's intents.

beforeAll(() => {
  useApiBase();
});

afterAll(() => {
  clearApiBase();
});

let meRole: "owner" | "member" = "owner";

beforeEach(() => {
  meRole = "owner";
  installFetchMock();
  writeSession({ token: "t-holidays", name: "Beta Yela" });
  setRespond(respondDefault);
});

afterEach(() => {
  restoreFetchMock();
  clearSession();
  window.localStorage.clear();
});

function holidayRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "h-1",
    date: "2026-11-28",
    name: "Dummy Holiday 1",
    description: null,
    scope: "all",
    officeIds: [],
    employeesOff: 94,
    ...overrides,
  };
}

function overviewPayload(): Record<string, unknown> {
  return {
    year: "2026",
    holidays: [holidayRow()],
    offices: [{ officeId: "o-1", name: "Head Office", staffCount: 12 }],
    unassignedCount: 2,
    weeklyOffDefaults: [{ valid: "[2026-10-01,)", days: [7] }],
  };
}

function impactPayload(): Record<string, unknown> {
  return {
    date: "2026-11-28",
    holiday: holidayRow(),
    affectedEmployees: [{ employeeId: "e-1", employeeName: "Amit Sharma", avatarUrl: null }],
    approvedLeaveCount: 1,
    trackedCount: 14,
    perOffice: [{ officeId: "o-1", name: "Head Office", staffCount: 12, closed: true }],
    unassignedCount: 2,
  };
}

function respondDefault(url: string): Response {
  if (url.endsWith("/users/me")) {
    return jsonResponse(
      meRole === "owner"
        ? { id: "u-own", role: "company_admin", name: "Beta Yela", platformAdmin: false }
        : { id: "u-emp", role: "employee", name: "Priya Nair", platformAdmin: false },
    );
  }
  // Order matters: the overview and impact URLs contain the bare list path.
  if (url.includes("/attendance/holidays/overview")) return jsonResponse(overviewPayload());
  if (url.includes("/attendance/holidays/impact")) return jsonResponse(impactPayload());
  if (url.endsWith("/attendance/holidays")) return jsonResponse([holidayRow()]);
  if (url.includes("/attendance/holidays/")) return jsonResponse(holidayRow());
  throw new TypeError(`offline in tests: ${url}`);
}

type HolidaysArgs = Parameters<typeof adminHolidaysLoader>[0];
type ActionArgs = Parameters<typeof adminHolidayAction>[0];

function holidaysArgs(path: string): HolidaysArgs {
  return {
    request: new Request(`https://console.test${path}`),
    params: {},
  } as unknown as HolidaysArgs;
}

function actionForm(fields: Record<string, string | string[]>): ActionArgs {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    if (Array.isArray(value)) for (const one of value) form.append(name, one);
    else form.append(name, value);
  }
  return {
    request: new Request("https://console.test/admin/company/holidays", {
      method: "POST",
      body: form,
    }),
    params: {},
  } as unknown as ActionArgs;
}

function callsTo(fragment: string): number {
  return sentRequests().filter((r) => r.url.includes(fragment)).length;
}

/** A loader that refuses must throw react-router's redirect Response. */
async function expectRedirect(loader: Promise<unknown>, to: string): Promise<void> {
  let thrown: unknown = null;
  try {
    await loader;
  } catch (error) {
    thrown = error;
  }
  expect(thrown).toBeInstanceOf(Response);
  expect((thrown as Response).headers.get("Location")).toBe(to);
}

describe("adminHolidaysLoader: one overview fetch carries the year", () => {
  it("the bare address fetches the current year's overview and never the impact call", async () => {
    const data = await adminHolidaysLoader(holidaysArgs("/admin/company/holidays"));
    expect(data.state).toBe("ok");
    if (data.state !== "ok") return;
    expect(data.year).toBe(String(new Date().getFullYear()));
    expect(data.selfName).toBe("Beta Yela");
    expect(data.overview.holidays).toHaveLength(1);
    expect(callsTo("/attendance/holidays/overview")).toBe(1);
    expect(callsTo("/attendance/holidays/impact")).toBe(0);
  });

  it("?year=2027 asks the backend for 2027 — an unparseable year falls back to today", async () => {
    const asked = await adminHolidaysLoader(holidaysArgs("/admin/company/holidays?year=2027"));
    expect(asked.state).toBe("ok");
    if (asked.state === "ok") expect(asked.year).toBe("2027");
    expect(sentRequests().some((r) => r.url.includes("overview?year=2027"))).toBe(true);

    const junk = await adminHolidaysLoader(holidaysArgs("/admin/company/holidays?year=90210"));
    expect(junk.state).toBe("ok");
    if (junk.state === "ok") expect(junk.year).toBe(String(new Date().getFullYear()));
  });

  it("a dead overview fails the page — a dead session or a member never gets this far", async () => {
    setRespond((url) =>
      url.includes("/attendance/holidays/overview")
        ? jsonResponse({ message: "nope" }, 500)
        : respondDefault(url),
    );
    expect(await adminHolidaysLoader(holidaysArgs("/admin/company/holidays"))).toEqual({
      state: "failed",
    });

    // CAP-8: the loader above cached the live identity; a dead session is
    // only observable past that seam, so drop the cache before the 401 leg.
    resetIdentityCacheForTests();
    setRespond((url) => (url.endsWith("/users/me") ? jsonResponse({}, 401) : respondDefault(url)));
    await expectRedirect(adminHolidaysLoader(holidaysArgs("/admin/company/holidays")), "/login");
    // The dead session must go before the redirect — nothing reads a stale token.
    expect(readSession()).toBeNull();

    // The 401 leg cleared the session AND left the 401 responder aimed —
    // restore both before the member leg (a signed-in member gets the gate).
    writeSession({ token: "t-holidays", name: "Priya Nair" });
    setRespond(respondDefault);
    meRole = "member";
    await expectRedirect(adminHolidaysLoader(holidaysArgs("/admin/company/holidays")), "/admin");
  });
});

describe("adminHolidayScheduleLoader: ?inspect is the open row", () => {
  it("no ?inspect — one overview fetch, inspect null, the impact endpoint never asked", async () => {
    const data = await adminHolidayScheduleLoader(holidaysArgs("/admin/company/holidays/schedule"));
    expect(data.state).toBe("ok");
    if (data.state === "ok") {
      expect(data.inspect).toBeNull();
      expect(data.selfName).toBe("Beta Yela");
    }
    expect(callsTo("/attendance/holidays/overview")).toBe(1);
    expect(callsTo("/attendance/holidays/impact")).toBe(0);
  });

  it("?inspect=2026-11-28 rides the same navigation — one overview, one impact", async () => {
    const data = await adminHolidayScheduleLoader(
      holidaysArgs("/admin/company/holidays/schedule?inspect=2026-11-28"),
    );
    expect(data.state).toBe("ok");
    if (data.state === "ok") {
      expect(data.inspect?.date).toBe("2026-11-28");
      expect(data.inspect?.trackedCount).toBe(14);
      expect(data.inspect?.perOffice[0].closed).toBe(true);
    }
    expect(callsTo("/attendance/holidays/overview")).toBe(1);
    expect(callsTo("/attendance/holidays/impact")).toBe(1);
  });

  it("a dead impact degrades to a closed sheet — the page itself stays ok", async () => {
    setRespond((url) =>
      url.includes("/attendance/holidays/impact")
        ? jsonResponse({ message: "nope" }, 500)
        : respondDefault(url),
    );
    const data = await adminHolidayScheduleLoader(
      holidaysArgs("/admin/company/holidays/schedule?inspect=2026-11-28"),
    );
    expect(data.state).toBe("ok");
    if (data.state === "ok") expect(data.inspect).toBeNull();
  });

  it("an inspect value that is not a date never reaches the impact endpoint", async () => {
    const data = await adminHolidayScheduleLoader(
      holidaysArgs("/admin/company/holidays/schedule?inspect=tomorrow"),
    );
    expect(data.state).toBe("ok");
    if (data.state === "ok") expect(data.inspect).toBeNull();
    expect(callsTo("/attendance/holidays/impact")).toBe(0);
  });

  it("an expired session on the schedule page lands on /login", async () => {
    setRespond((url) => (url.endsWith("/users/me") ? jsonResponse({}, 401) : respondDefault(url)));
    await expectRedirect(
      adminHolidayScheduleLoader(holidaysArgs("/admin/company/holidays/schedule")),
      "/login",
    );
    expect(readSession()).toBeNull();
  });
});

describe("adminHolidayUploadLoader: the popup classifies against EVERY year", () => {
  it("the overview AND the whole-calendar list load — existing carries every holiday's shape", async () => {
    setRespond((url) => {
      if (url.endsWith("/attendance/holidays")) {
        return jsonResponse([
          holidayRow(),
          holidayRow({
            id: "h-old",
            date: "2024-12-25",
            name: "Christmas",
            description: "Fixed date",
            scope: "offices",
            officeIds: ["o-1"],
            employeesOff: undefined,
          }),
        ]);
      }
      return respondDefault(url);
    });
    const data = await adminHolidayUploadLoader(holidaysArgs("/admin/company/holidays/upload"));
    expect(data.state).toBe("ok");
    if (data.state === "ok") {
      expect(data.year).toBe(String(new Date().getFullYear()));
      expect(data.existing).toEqual([
        {
          date: "2026-11-28",
          name: "Dummy Holiday 1",
          description: null,
          scope: "all",
          officeIds: [],
        },
        {
          date: "2024-12-25",
          name: "Christmas",
          description: "Fixed date",
          scope: "offices",
          officeIds: ["o-1"],
        },
      ]);
    }
    expect(callsTo("/attendance/holidays/overview")).toBe(1);
    expect(callsTo("/attendance/holidays")).toBe(2); // overview + the list
  });

  it("a dead calendar list fails the page — an expired session lands on /login", async () => {
    setRespond((url) =>
      url.endsWith("/attendance/holidays")
        ? jsonResponse({ message: "nope" }, 500)
        : respondDefault(url),
    );
    expect(await adminHolidayUploadLoader(holidaysArgs("/admin/company/holidays/upload"))).toEqual({
      state: "failed",
    });

    // CAP-8: the failed call above rode a cached identity; cross the cache
    // seam so the 401 leg is actually observed.
    resetIdentityCacheForTests();
    setRespond((url) => (url.endsWith("/users/me") ? jsonResponse({}, 401) : respondDefault(url)));
    await expectRedirect(
      adminHolidayUploadLoader(holidaysArgs("/admin/company/holidays/upload")),
      "/login",
    );
    expect(readSession()).toBeNull();
  });
});

describe("adminHolidayAction: the modal's save and remove intents", () => {
  it("create ships the modal's fields — no chips picked means scope all", async () => {
    const result = await adminHolidayAction(
      actionForm({ intent: "create", name: "Founder's Day", date: "2026-12-02" }),
    );
    expect(result).toEqual({ kind: "create", state: "done" });
    const post = sentRequests().find((r) => r.url.endsWith("/attendance/holidays"));
    expect(post?.method).toBe("POST");
    expect(post?.body).toEqual({
      date: "2026-12-02",
      name: "Founder's Day",
      officeIds: [],
      scope: "all",
    });
  });

  it("create with office chips ships scope offices with the picked ids", async () => {
    await adminHolidayAction(
      actionForm({
        intent: "create",
        name: "Branch Day",
        date: "2026-12-03",
        description: "Branch-only",
        officeId: ["o-1", "o-2"],
      }),
    );
    const post = sentRequests().find((r) => r.url.endsWith("/attendance/holidays"));
    expect(post?.body).toEqual({
      date: "2026-12-03",
      name: "Branch Day",
      description: "Branch-only",
      officeIds: ["o-1", "o-2"],
      scope: "offices",
    });
  });

  it("a missing name or date answers the fill-it-in line and never reaches the backend", async () => {
    const result = await adminHolidayAction(actionForm({ intent: "create", name: "", date: "" }));
    expect(result).toEqual({
      kind: "create",
      state: "error",
      message: "Please enter the holiday's name and date.",
    });
    expect(callsTo("/attendance/holidays")).toBe(0);
  });

  it("the backend's raced add (409 ATTENDANCE_HOLIDAY_TAKEN) becomes the pick-another-date line", async () => {
    setRespond((url) =>
      url.endsWith("/attendance/holidays")
        ? jsonResponse({ error_code: "ATTENDANCE_HOLIDAY_TAKEN", message: "taken" }, 409)
        : respondDefault(url),
    );
    const result = await adminHolidayAction(
      actionForm({ intent: "create", name: "Diwali", date: "2026-11-08" }),
    );
    expect(result).toEqual({
      kind: "create",
      state: "error",
      message: "A holiday on this date already exists. Pick another date or edit the existing one.",
    });
  });

  it("update patches the row — an emptied description ships as null", async () => {
    const result = await adminHolidayAction(
      actionForm({
        intent: "update",
        id: "h-1",
        name: "Renamed",
        date: "2026-11-28",
        description: "",
      }),
    );
    expect(result).toEqual({ kind: "update", state: "done" });
    const patch = sentRequests().find((r) => r.url.endsWith("/attendance/holidays/h-1"));
    expect(patch?.method).toBe("PATCH");
    expect(patch?.body).toMatchObject({
      date: "2026-11-28",
      name: "Renamed",
      description: null,
      scope: "all",
    });
  });

  it("remove deletes the row; a remove with no id never reaches the backend", async () => {
    const gone = await adminHolidayAction(actionForm({ intent: "remove", id: "h-1" }));
    expect(gone).toEqual({ kind: "remove", state: "done" });
    const del = sentRequests().find((r) => r.url.endsWith("/attendance/holidays/h-1"));
    expect(del?.method).toBe("DELETE");

    const noId = await adminHolidayAction(actionForm({ intent: "remove" }));
    expect(noId).toEqual({
      kind: "remove",
      state: "error",
      message: "This holiday could not be found. Refresh and try again.",
    });
  });

  it("an unknown intent is refused before any auth call", async () => {
    const result = await adminHolidayAction(
      actionForm({ intent: "nuke", name: "X", date: "2026-12-02" }),
    );
    expect(result).toEqual({
      kind: "create",
      state: "error",
      message: "We could not save the holiday. Please try again.",
    });
    expect(sentRequests()).toHaveLength(0);
  });
});
