import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { adminAttendanceLoader, adminJobsLoader } from "./adminBrowseLoaders";
import { istShifted, istToday } from "./format";
import { clearSession, SESSION_KEY, writeSession } from "../../services/session";
import {
  clearApiBase,
  installFetchMock,
  jsonResponse,
  restoreFetchMock,
  sentRequests,
  setRespond,
  useApiBase,
} from "../../testing/fetchMock";

// The tabbed jobs page's loader: the URL's `?tab=` (and the queue's and the
// report's own params) decide which slice of the backend is asked for — a tab
// change is navigation, so a tab the user never opened never costs a request.
// These tests are the wire contract of that rule: which endpoints each
// address may call, which it must never call for a member, and how a dead
// slice degrades without failing the page.

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
  setRespond(respondDefault);
});

afterEach(() => {
  restoreFetchMock();
  clearSession();
  window.localStorage.clear();
});

function page(data: unknown[], hasMore = false): Response {
  return jsonResponse({ data, nextCursor: hasMore ? "c-next" : null, hasMore });
}

function ownerReport(): Response {
  return jsonResponse({
    range: { from: istShifted(-29), to: istToday() },
    headline: {
      employeeCreated: 6,
      employeeApproved: 3,
      employeeAutoApproved: 1,
      ownerCreated: 2,
    },
    pipeline: {
      pending: 3,
      pendingOverOneDay: 1,
      rejected: 0,
      rejectedWithReason: 0,
      rejectedWithoutReason: 0,
      approvalRate: null,
      averageMinutesToDecision: null,
      medianMinutesToDecision: null,
      oldestPending: null,
    },
    perEmployee: [],
    employeesWithPermissionNoJobs: [],
  });
}

function memberRow(): Record<string, unknown> {
  return {
    userId: "u-1",
    name: "Priya Nair",
    countryCode: "+91",
    phoneNumber: "9876543210",
    employeeCode: "E-12",
    role: "employee",
    status: "active",
    createdAt: "2026-01-01T00:00:00Z",
  };
}

function respondDefault(url: string): Response {
  if (url.endsWith("/users/me")) {
    return jsonResponse(
      meRole === "owner"
        ? { id: "u-own", role: "company_admin", name: "Beta Yela", platformAdmin: false }
        : {
            id: "u-emp",
            role: "employee",
            name: "Priya Nair",
            platformAdmin: false,
            canCreateJobs: true,
            jobApprovalRequired: true,
          },
    );
  }
  if (url.includes("/job-reports/owner")) return ownerReport();
  if (url.includes("/job-reports/employee")) {
    return jsonResponse({ range: { from: "2026-10-16", to: "2026-11-14" } });
  }
  if (url.includes("/approval-queue/mine")) return page([]);
  // The owner's queue — anything on /approval-queue that is not /mine.
  if (url.includes("/approval-queue"))
    return jsonResponse({ data: [], nextCursor: null, hasMore: false });
  if (url.includes("/jobs?scope="))
    return page([{ id: "j-1", jobNumber: "JB-1", status: "completed", scheduledStart: null }]);
  if (url.includes("/members")) return jsonResponse([memberRow()]);
  if (url.includes("/notifications")) return jsonResponse({ data: [] });
  if (url.includes("/reports?limit=")) return page([]);
  if (url.includes("/attendance/monthly")) {
    return jsonResponse({ from: "2026-11-01", to: "2026-11-14", employees: [] });
  }
  throw new TypeError(`offline in tests: ${url}`);
}

type JobsArgs = Parameters<typeof adminJobsLoader>[0];
type AttendanceArgs = Parameters<typeof adminAttendanceLoader>[0];

function jobsArgs(path: string): JobsArgs {
  return {
    request: new Request(`https://console.test${path}`),
    params: {},
  } as unknown as JobsArgs;
}

function attendanceArgs(path: string): AttendanceArgs {
  return jobsArgs(path) as unknown as AttendanceArgs;
}

function callsTo(fragment: string): number {
  return sentRequests().filter((r) => r.url.includes(fragment)).length;
}

function ownerQueueCalls(): number {
  // /approval-queue/mine is the member's own pending list, not the queue.
  return sentRequests().filter((r) => r.url.includes("/approval-queue") && !r.url.includes("/mine"))
    .length;
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

describe("adminJobsLoader: the address decides the owner's tab", () => {
  it("the bare jobs address fetches the jobs list and the pipeline badge", async () => {
    writeSession({ token: "tok-1", name: "Beta" });
    const data = (await adminJobsLoader(jobsArgs("/admin/company/jobs"))) as Extract<
      Awaited<ReturnType<typeof adminJobsLoader>>,
      { state: "ok" }
    >;
    expect(data.tab).toBe("jobs");
    expect(data.role).toBe("owner");
    expect(callsTo("/jobs?scope=")).toBeGreaterThan(0);
    // The badge data rides every owner tab, so the Approval tab shows its
    // waiting count without being opened.
    expect(callsTo("/job-reports/owner")).toBe(1);
    if (data.tab === "jobs" && data.role === "owner") {
      expect(data.pipeline.ok).toBe(true);
      expect(data.pipeline.ok && data.pipeline.data.pending).toBe(3);
    }
  });

  it("the approval tab fetches the queue and the badge, never the jobs list", async () => {
    writeSession({ token: "tok-1", name: "Beta" });
    const data = (await adminJobsLoader(jobsArgs("/admin/company/jobs?tab=approval"))) as Extract<
      Awaited<ReturnType<typeof adminJobsLoader>>,
      { state: "ok" }
    >;
    expect(data.tab).toBe("approval");
    expect(callsTo("/jobs?scope=")).toBe(0);
    expect(ownerQueueCalls()).toBe(1);
    expect(callsTo("/job-reports/owner")).toBe(1);
  });

  it("the report tab fetches history, roster and pipeline, never the jobs list", async () => {
    writeSession({ token: "tok-1", name: "Beta" });
    const data = (await adminJobsLoader(jobsArgs("/admin/company/jobs?tab=report"))) as Extract<
      Awaited<ReturnType<typeof adminJobsLoader>>,
      { state: "ok" }
    >;
    expect(data.tab).toBe("report");
    expect(callsTo("/jobs?scope=")).toBe(0);
    expect(callsTo("/reports?limit=")).toBe(1);
    expect(callsTo("/members")).toBe(1);
    expect(callsTo("/job-reports/owner")).toBe(1);
  });

  it("the activity tab fetches the feed and the badge, never the jobs list", async () => {
    writeSession({ token: "tok-1", name: "Beta" });
    const data = (await adminJobsLoader(jobsArgs("/admin/company/jobs?tab=activity"))) as Extract<
      Awaited<ReturnType<typeof adminJobsLoader>>,
      { state: "ok" }
    >;
    expect(data.tab).toBe("activity");
    expect(callsTo("/jobs?scope=")).toBe(0);
    expect(callsTo("/notifications")).toBe(1);
    expect(callsTo("/job-reports/owner")).toBe(1);
  });

  it("an old queue deep link (?cursor=) lands on the approval tab", async () => {
    writeSession({ token: "tok-1", name: "Beta" });
    const data = (await adminJobsLoader(jobsArgs("/admin/company/jobs?cursor=c-9"))) as Extract<
      Awaited<ReturnType<typeof adminJobsLoader>>,
      { state: "ok" }
    >;
    expect(data.tab).toBe("approval");
    const queueCall = sentRequests().find((r) => r.url.includes("/approval-queue"));
    expect(new URL(queueCall?.url ?? "").searchParams.get("cursor")).toBe("c-9");
  });

  it("a hand-typed unknown tab falls back to the jobs tab, not a crash", async () => {
    writeSession({ token: "tok-1", name: "Beta" });
    const data = (await adminJobsLoader(jobsArgs("/admin/company/jobs?tab=nonsense"))) as Extract<
      Awaited<ReturnType<typeof adminJobsLoader>>,
      { state: "ok" }
    >;
    expect(data.tab).toBe("jobs");
    expect(callsTo("/jobs?scope=")).toBeGreaterThan(0);
  });

  it("a hand-typed status outside the whitelist is read as All", async () => {
    writeSession({ token: "tok-1", name: "Beta" });
    const data = (await adminJobsLoader(
      jobsArgs("/admin/company/jobs?tab=jobs&status=banana"),
    )) as Extract<Awaited<ReturnType<typeof adminJobsLoader>>, { state: "ok" }>;
    expect(data.tab).toBe("jobs");
    if (data.tab === "jobs") expect(data.status).toBe("");
  });

  it("a real status filter is one server-filtered call, not the four-scope merge", async () => {
    writeSession({ token: "tok-1", name: "Beta" });
    const data = (await adminJobsLoader(
      jobsArgs("/admin/company/jobs?tab=jobs&status=scheduled"),
    )) as Extract<Awaited<ReturnType<typeof adminJobsLoader>>, { state: "ok" }>;
    expect(data.tab).toBe("jobs");
    if (data.tab === "jobs") expect(data.status).toBe("scheduled");
    const jobsCalls = sentRequests().filter((r) => r.url.includes("/jobs?scope="));
    expect(jobsCalls.length).toBe(1);
    const query = new URL(jobsCalls[0]?.url ?? "").searchParams;
    expect(query.get("scope")).toBe("all");
    expect(query.get("status")).toBe("scheduled");
  });
});

describe("adminJobsLoader: the address decides the member's tab", () => {
  it("a member asking for the approval tab gets the jobs tab, and no owner endpoint is called", async () => {
    meRole = "member";
    writeSession({ token: "tok-1", name: "Priya" });
    const data = (await adminJobsLoader(jobsArgs("/admin/company/jobs?tab=approval"))) as Extract<
      Awaited<ReturnType<typeof adminJobsLoader>>,
      { state: "ok" }
    >;
    expect(data.role).toBe("member");
    expect(data.tab).toBe("jobs");
    // The owner's queue and the owner's report are owner-gated endpoints —
    // the fallback must not fire either, not even optimistically.
    expect(ownerQueueCalls()).toBe(0);
    expect(callsTo("/job-reports/owner")).toBe(0);
    expect(callsTo("/approval-queue/mine")).toBe(1);
  });

  it("the member's bare jobs address never touches the owner's report", async () => {
    meRole = "member";
    writeSession({ token: "tok-1", name: "Priya" });
    const data = (await adminJobsLoader(jobsArgs("/admin/company/jobs"))) as Extract<
      Awaited<ReturnType<typeof adminJobsLoader>>,
      { state: "ok" }
    >;
    expect(data.tab).toBe("jobs");
    expect(callsTo("/job-reports/owner")).toBe(0);
  });

  it("an old report deep link (?range=7) lands on the report tab with the 7-day window", async () => {
    meRole = "member";
    writeSession({ token: "tok-1", name: "Priya" });
    const data = (await adminJobsLoader(jobsArgs("/admin/company/jobs?range=7"))) as Extract<
      Awaited<ReturnType<typeof adminJobsLoader>>,
      { state: "ok" }
    >;
    expect(data.tab).toBe("report");
    const reportCall = sentRequests().find((r) => r.url.includes("/job-reports/employee"));
    const query = new URL(reportCall?.url ?? "").searchParams;
    expect(query.get("from")).toBe(istShifted(-6));
    expect(query.get("to")).toBe(istToday());
  });

  it("an old rejected deep link (?rejectedCursor=) lands on the rejected tab", async () => {
    meRole = "member";
    writeSession({ token: "tok-1", name: "Priya" });
    const data = (await adminJobsLoader(
      jobsArgs("/admin/company/jobs?rejectedCursor=c-next"),
    )) as Extract<Awaited<ReturnType<typeof adminJobsLoader>>, { state: "ok" }>;
    expect(data.tab).toBe("rejected");
    const rejectedCall = sentRequests().find((r) => r.url.includes("status=rejected"));
    expect(new URL(rejectedCall?.url ?? "").searchParams.get("cursor")).toBe("c-next");
  });

  it("the member's activity tab fetches only the feed — no owner report to trip a 403", async () => {
    meRole = "member";
    writeSession({ token: "tok-1", name: "Priya" });
    const data = (await adminJobsLoader(jobsArgs("/admin/company/jobs?tab=activity"))) as Extract<
      Awaited<ReturnType<typeof adminJobsLoader>>,
      { state: "ok" }
    >;
    expect(data.tab).toBe("activity");
    expect(callsTo("/notifications")).toBe(1);
    expect(callsTo("/job-reports/owner")).toBe(0);
    expect(callsTo("/jobs?scope=")).toBe(0);
  });

  it("the report tab ignores a jobs-table status param", async () => {
    meRole = "member";
    writeSession({ token: "tok-1", name: "Priya" });
    const data = (await adminJobsLoader(
      jobsArgs("/admin/company/jobs?tab=report&status=scheduled"),
    )) as Extract<Awaited<ReturnType<typeof adminJobsLoader>>, { state: "ok" }>;
    expect(data.tab).toBe("report");
    expect(callsTo("/jobs?scope=")).toBe(0);
  });
});

describe("adminJobsLoader: degradation, not blank screens", () => {
  it("a dead pipeline leaves the approval tab working, minus its badge", async () => {
    writeSession({ token: "tok-1", name: "Beta" });
    setRespond((url) =>
      url.includes("/job-reports/owner") ? jsonResponse({}, 500) : respondDefault(url),
    );
    const data = (await adminJobsLoader(jobsArgs("/admin/company/jobs?tab=approval"))) as Extract<
      Awaited<ReturnType<typeof adminJobsLoader>>,
      { state: "ok" }
    >;
    expect(data.state).toBe("ok");
    expect(data.tab).toBe("approval");
    if (data.tab === "approval") {
      expect(data.queue.ok).toBe(true);
      expect(data.pipeline.ok).toBe(false);
    }
  });

  it("a dead queue degrades to its own retry, still on the approval tab", async () => {
    writeSession({ token: "tok-1", name: "Beta" });
    setRespond((url) =>
      url.includes("/approval-queue") ? jsonResponse({}, 500) : respondDefault(url),
    );
    const data = (await adminJobsLoader(jobsArgs("/admin/company/jobs?tab=approval"))) as Extract<
      Awaited<ReturnType<typeof adminJobsLoader>>,
      { state: "ok" }
    >;
    expect(data.state).toBe("ok");
    if (data.tab === "approval") {
      // Two levels of settle: the outer slice is the queue's whole state
      // (filters, roster and all), the inner one is the queue page itself.
      const queue = data.queue;
      expect(queue.ok).toBe(true);
      if (queue.ok) expect(queue.data.queue.ok).toBe(false);
    }
  });

  it("a dead jobs list fails the page loudly, but the tab strip survives", async () => {
    writeSession({ token: "tok-1", name: "Beta" });
    setRespond((url) =>
      url.includes("/jobs?scope=") ? jsonResponse({}, 500) : respondDefault(url),
    );
    const data = await adminJobsLoader(jobsArgs("/admin/company/jobs"));
    expect(data.state).toBe("failed");
    if (data.state === "failed") {
      expect(data.role).toBe("owner");
      expect(data.tab).toBe("jobs");
    }
  });

  it("a member's dead jobs list carries the member's role, not the owner's tabs", async () => {
    meRole = "member";
    writeSession({ token: "tok-1", name: "Priya" });
    setRespond((url) =>
      url.includes("/jobs?scope=") ? jsonResponse({}, 500) : respondDefault(url),
    );
    const data = await adminJobsLoader(jobsArgs("/admin/company/jobs"));
    expect(data.state).toBe("failed");
    if (data.state === "failed") {
      expect(data.role).toBe("member");
      expect(data.tab).toBe("jobs");
    }
  });

  it("an expired sign-in on the queue tab signs out too — the dead slice is not a retry loop", async () => {
    writeSession({ token: "tok-1", name: "Beta" });
    setRespond((url) =>
      url.includes("/approval-queue") ? jsonResponse({}, 401) : respondDefault(url),
    );
    await expectRedirect(adminJobsLoader(jobsArgs("/admin/company/jobs?tab=approval")), "/login");
    expect(window.localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it("no saved sign-in sends the visitor to login", async () => {
    await expectRedirect(adminJobsLoader(jobsArgs("/admin/company/jobs")), "/login");
  });

  it("an expired sign-in (401) clears the session and sends the visitor to login", async () => {
    writeSession({ token: "tok-1", name: "Beta" });
    setRespond((url) => (url.endsWith("/users/me") ? jsonResponse({}, 401) : respondDefault(url)));
    await expectRedirect(adminJobsLoader(jobsArgs("/admin/company/jobs")), "/login");
    expect(window.localStorage.getItem(SESSION_KEY)).toBeNull();
  });
});

describe("adminAttendanceLoader: two tabs, each fetching only its own data", () => {
  it("the bare address loads the running month's table", async () => {
    writeSession({ token: "tok-1", name: "Beta" });
    const data = (await adminAttendanceLoader(
      attendanceArgs("/admin/company/attendance"),
    )) as Extract<Awaited<ReturnType<typeof adminAttendanceLoader>>, { state: "ok" }>;
    expect(data.tab).toBe("month");
    const monthlyCall = sentRequests().find((r) => r.url.includes("/attendance/monthly"));
    const query = new URL(monthlyCall?.url ?? "").searchParams;
    expect(query.get("from")).toBe(`${istToday().slice(0, 7)}-01`);
    expect(query.get("to")).toBe(istToday());
    // The server-owned range wins over the client's guess.
    expect(data.tab === "month" && data.from).toBe("2026-11-01");
  });

  it("the report tab loads the report history, never the month table", async () => {
    writeSession({ token: "tok-1", name: "Beta" });
    const data = (await adminAttendanceLoader(
      attendanceArgs("/admin/company/attendance?tab=report"),
    )) as Extract<Awaited<ReturnType<typeof adminAttendanceLoader>>, { state: "ok" }>;
    expect(data.tab).toBe("report");
    expect(callsTo("/attendance/monthly")).toBe(0);
    expect(callsTo("/reports?limit=")).toBe(1);
  });

  it("a dead month table fails loudly, keeping the month tab for the retry", async () => {
    writeSession({ token: "tok-1", name: "Beta" });
    setRespond((url) =>
      url.includes("/attendance/monthly") ? jsonResponse({}, 500) : respondDefault(url),
    );
    const data = await adminAttendanceLoader(attendanceArgs("/admin/company/attendance"));
    expect(data.state).toBe("failed");
    expect(data.state === "failed" && data.tab).toBe("month");
  });

  it("a dead report history degrades to its own retry, still on the report tab", async () => {
    writeSession({ token: "tok-1", name: "Beta" });
    setRespond((url) =>
      url.includes("/reports?limit=") ? jsonResponse({}, 500) : respondDefault(url),
    );
    const data = (await adminAttendanceLoader(
      attendanceArgs("/admin/company/attendance?tab=report"),
    )) as Extract<Awaited<ReturnType<typeof adminAttendanceLoader>>, { state: "ok" }>;
    expect(data.state).toBe("ok");
    expect(data.tab).toBe("report");
    expect(data.tab === "report" && data.history.ok).toBe(false);
  });

  it("a member hand-typing the attendance address is sent home, not shown owner data", async () => {
    meRole = "member";
    writeSession({ token: "tok-1", name: "Priya" });
    await expectRedirect(
      adminAttendanceLoader(attendanceArgs("/admin/company/attendance?tab=report")),
      "/admin",
    );
  });
});
