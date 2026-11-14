import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { cleanup, render, screen, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { routes } from "../app/routes";
import { writeSession } from "../services/session";
import { istFirstOfMonth, istShifted, istToday } from "../features/admin/format";
import {
  clearApiBase,
  installFetchMock,
  jsonResponse,
  restoreFetchMock,
  sentRequests,
  setRespond,
  useApiBase,
} from "../testing/fetchMock";

// The employee's Me section (Epic 22, CAP-2/CAP-4/CAP-7/CAP-8): the New job
// card follows the caller's own create switch, the pending card degrades when
// its slice fails, and the rejected history and activity report render with
// their boundary copy. Every endpoint answers by URL, statelessly — the page
// reloads them wholesale on each navigation.
//
// Copy note: the spec names the pending section "Pending owner approval"
// (CAP-4); the console deliberately says "Waiting for approval" (review
// decision 2026-11-14) — plain business English, consistent with the rest of
// the console. These tests pin the implementation's copy on purpose.

beforeAll(() => {
  useApiBase();
});

afterAll(() => {
  clearApiBase();
});

beforeEach(() => {
  installFetchMock();
  setRespond(respondDefault);
});

function respondDefault(url: string): Response {
  if (url.endsWith("/users/me")) {
    return jsonResponse({
      id: "u-emp",
      role: "employee",
      name: "Priya Nair",
      platformAdmin: false,
      email: "priya@example.com",
      countryCode: "+91",
      phoneNumber: "9876543210",
      employeeCode: "E-12",
      status: "active",
      canCreateJobs: state.canCreateJobs,
      jobApprovalRequired: state.jobApprovalRequired,
    });
  }
  if (url.includes("/attendance/me/monthly")) {
    return jsonResponse({
      from: "2026-11-01",
      to: "2026-11-14",
      summary: {
        daysWorked: 9,
        halfDays: 1,
        lateCount: 0,
        leave: 1,
        weeklyOffs: 2,
        holidays: 1,
        workedOnHoliday: 0,
        absent: 0,
        checkoutMissing: 0,
      },
      weeklyOffs: [7],
      upcomingHolidays: [],
    });
  }
  if (url.includes("/attendance/me/leave")) return page([]);
  if (url.includes("scope=all&status=rejected")) return page(state.rejected, state.rejectedMore);
  if (url.endsWith("/jobs?scope=history")) return page([]);
  if (url.includes("/approval-queue/mine")) return page(state.pending, state.pendingMore);
  if (url.includes("/job-reports/employee")) return state.report();
  if (url.endsWith("/attendance/me/summary")) {
    return jsonResponse({
      officeName: null,
      startTime: null,
      endTime: null,
      lateCutOffMinutes: null,
      weeklyOffDays: [],
      officeLatitude: null,
      officeLongitude: null,
      officeRadius: null,
      today: null,
      todayRecord: null,
    });
  }
  throw new TypeError(`offline in tests: ${url}`);
}

afterEach(() => {
  restoreFetchMock();
  window.localStorage.clear();
  window.sessionStorage.clear();
  cleanup();
});

let state: {
  canCreateJobs: boolean;
  jobApprovalRequired: boolean;
  pending: unknown[];
  pendingMore: boolean;
  rejected: unknown[];
  rejectedMore: boolean;
  report: () => Response;
};

function page(data: unknown[], hasMore = false): Response {
  return jsonResponse({ data, nextCursor: hasMore ? "c-next" : null, hasMore });
}

function pendingRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "p1",
    jobNumber: "JOB-21",
    submittedAt: "2026-11-13T05:30:00Z",
    ageHours: 26,
    employee: { id: "u-emp", name: "Priya Nair" },
    customerName: "Sharma Traders",
    ...overrides,
  };
}

function rejectedRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    jobNumber: "JOB-11",
    description: "AC service",
    rejectionReason: "Customer rescheduled",
    decidedAt: "2026-11-10T09:00:00Z",
    scheduledStart: "2026-11-10T04:00:00Z",
    ...overrides,
  };
}

function employeeReport(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    range: { from: "2026-10-16", to: "2026-11-14" },
    created: { created: 6, approved: 3, autoApproved: 1, rejected: 2, pending: 1, cancelled: 0 },
    approvalRate: 0.5,
    averageMinutesToDecision: 120,
    medianMinutesToDecision: 90,
    assignedNow: 2,
    completedInRange: 4,
    rejectionReasons: [
      {
        jobId: "j1",
        jobNumber: "JOB-11",
        reason: "Customer rescheduled",
        decidedAt: "2026-11-10T09:00:00Z",
      },
      { jobId: "j2", jobNumber: "JOB-7", reason: null, decidedAt: "2026-11-08T09:00:00Z" },
    ],
    rejectionReasonsTotal: 5,
    ...overrides,
  };
}

function renderMe(entry = "/admin/me"): void {
  const router = createMemoryRouter(routes, { initialEntries: [entry] });
  render(<RouterProvider router={router} />);
}

async function card(name: string): Promise<HTMLElement> {
  // The loader resolves after the first paint, so the heading is awaited.
  const heading = await screen.findByRole("heading", { name });
  const section = heading.closest("section");
  if (section === null) throw new Error(`no card titled ${name}`);
  return section;
}

function defaultState(): void {
  state = {
    canCreateJobs: true,
    jobApprovalRequired: true,
    pending: [pendingRow()],
    pendingMore: false,
    rejected: [rejectedRow()],
    rejectedMore: false,
    report: () => jsonResponse(employeeReport()),
  };
}

describe("AdminMePage: the New job card follows the create switch (CAP-2)", () => {
  it("shows the card with the waiting copy when creation needs approval", async () => {
    defaultState();
    writeSession({ token: "tok-1", name: "Priya" });
    renderMe();
    const newJob = await card("New job");
    expect(within(newJob).getByRole("link", { name: "Create a job" })).toHaveAttribute(
      "href",
      "/admin/me/new-job",
    );
    expect(
      within(newJob).getByText(/it waits for your owner's approval first/),
    ).toBeInTheDocument();
  });

  it("says the job is assigned at once when approval is off", async () => {
    defaultState();
    state.jobApprovalRequired = false;
    writeSession({ token: "tok-1", name: "Priya" });
    renderMe();
    await card("New job");
    expect(screen.getByText(/it is assigned to you at once/)).toBeInTheDocument();
  });

  it("shows no New job card at all when the switch is off", async () => {
    defaultState();
    state.canCreateJobs = false;
    writeSession({ token: "tok-1", name: "Priya" });
    renderMe();
    await screen.findByRole("heading", { name: "My job activity" });
    expect(screen.queryByText("New job")).toBeNull();
  });
});

describe("AdminMePage: my pending submissions (CAP-4)", () => {
  it("lists each waiting job with its customer and age, and counts beyond one page", async () => {
    defaultState();
    state.pending = [
      pendingRow(),
      pendingRow({ id: "p2", jobNumber: "JOB-18", customerName: null }),
    ];
    state.pendingMore = true;
    writeSession({ token: "tok-1", name: "Priya" });
    renderMe();
    const pending = await card("Waiting for approval");
    expect(within(pending).getByText("JOB-21")).toBeInTheDocument();
    expect(within(pending).getByText(/Sharma Traders/)).toBeInTheDocument();
    expect(within(pending).getByText(/no customer/)).toBeInTheDocument();
    expect(within(pending).getByText("2+")).toBeInTheDocument();
    expect(
      within(pending).getByText("Older submissions follow on the next pages."),
    ).toBeInTheDocument();
  });

  it("shows an alert, not a blank gap, when the pending list fails", async () => {
    defaultState();
    setRespond((url) =>
      url.includes("/approval-queue/mine") ? jsonResponse({}, 500) : respondDefault(url),
    );
    writeSession({ token: "tok-1", name: "Priya" });
    renderMe();
    expect(
      await screen.findByText(/Your waiting-for-approval list could not load/),
    ).toBeInTheDocument();
  });

  it("shows no pending card at all when the list is empty, even with more pages", async () => {
    defaultState();
    state.pending = [];
    state.pendingMore = true;
    writeSession({ token: "tok-1", name: "Priya" });
    renderMe();
    await screen.findByRole("heading", { name: "My job activity" });
    expect(screen.queryByText("Waiting for approval")).toBeNull();
    expect(screen.queryByText("Older submissions follow on the next pages.")).toBeNull();
  });
});

describe("AdminMePage: my rejected jobs, all time (CAP-7)", () => {
  it("renders the history with a reason and the no-reason fallback", async () => {
    defaultState();
    writeSession({ token: "tok-1", name: "Priya" });
    renderMe();
    const rejected = await card("My rejected jobs");
    expect(within(rejected).getByText("JOB-11")).toBeInTheDocument();
    expect(within(rejected).getByText("Customer rescheduled")).toBeInTheDocument();
  });

  it("says no reason was given when the owner declined without one", async () => {
    defaultState();
    state.rejected = [rejectedRow({ rejectionReason: null })];
    writeSession({ token: "tok-1", name: "Priya" });
    renderMe();
    await card("My rejected jobs");
    expect(screen.getAllByText("No reason given").length).toBeGreaterThanOrEqual(1);
  });

  it("links the older page when more exist beyond the first fifty", async () => {
    defaultState();
    state.rejectedMore = true;
    writeSession({ token: "tok-1", name: "Priya" });
    renderMe();
    await card("My rejected jobs");
    expect(screen.getByText("1+")).toBeInTheDocument();
    // The link keeps the activity period: walking the rejected history must
    // not reset the report window to the default.
    expect(screen.getByRole("link", { name: "Load older rejections" })).toHaveAttribute(
      "href",
      "/admin/me?range=30&rejectedCursor=c-next",
    );
  });

  it("shows the count but no link when more exist without a cursor", async () => {
    defaultState();
    state.rejectedMore = true;
    setRespond((url) =>
      url.includes("scope=all&status=rejected")
        ? jsonResponse({ data: state.rejected, nextCursor: null, hasMore: true })
        : respondDefault(url),
    );
    writeSession({ token: "tok-1", name: "Priya" });
    renderMe();
    await card("My rejected jobs");
    expect(screen.getByText("1+")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Load older rejections" })).toBeNull();
  });

  it("shows the empty line when nothing of mine was rejected", async () => {
    defaultState();
    state.rejected = [];
    writeSession({ token: "tok-1", name: "Priya" });
    renderMe();
    await card("My rejected jobs");
    expect(
      within(
        screen.getByRole("heading", { name: "My rejected jobs" }).closest("section") as HTMLElement,
      ).getByText(/Nothing of yours was rejected/),
    ).toBeInTheDocument();
  });

  it("shows an alert, not a bare gap, when the rejected history fails", async () => {
    defaultState();
    setRespond((url) =>
      url.includes("scope=all&status=rejected") ? jsonResponse({}, 500) : respondDefault(url),
    );
    writeSession({ token: "tok-1", name: "Priya" });
    renderMe();
    expect(await screen.findByText(/Your rejected jobs could not load/)).toBeInTheDocument();
  });

  it("renders em dashes for a rejection without instants", async () => {
    defaultState();
    state.rejected = [rejectedRow({ decidedAt: null, scheduledStart: null })];
    writeSession({ token: "tok-1", name: "Priya" });
    renderMe();
    const rejected = await card("My rejected jobs");
    expect(within(rejected).getAllByText("—").length).toBe(2);
  });

  it("carries the rejected cursor into the request, not just the link", async () => {
    defaultState();
    writeSession({ token: "tok-1", name: "Priya" });
    renderMe("/admin/me?rejectedCursor=c-next");
    await card("My rejected jobs");
    const rejectedCall = sentRequests().find((r) => r.url.includes("scope=all&status=rejected"));
    expect(new URL(rejectedCall?.url ?? "").searchParams.get("cursor")).toBe("c-next");
  });
});

describe("AdminMePage: my job activity (CAP-8)", () => {
  it("renders the outcome tiles, the rates and the capped-reasons note", async () => {
    defaultState();
    writeSession({ token: "tok-1", name: "Priya" });
    renderMe();
    const activity = await card("My job activity");
    expect(within(activity).getByText("I created")).toBeInTheDocument();
    expect(within(activity).getByText("50%")).toBeInTheDocument();
    expect(
      within(activity).getByText(/Showing the 2 newest of 5 rejections in this period/),
    ).toBeInTheDocument();
    expect(within(activity).getByText("No reason given")).toBeInTheDocument();
  });

  it("loads the period the toggle names — the URL rides into the request", async () => {
    defaultState();
    writeSession({ token: "tok-1", name: "Priya" });
    renderMe("/admin/me?range=today");
    await card("My job activity");
    const reportCall = sentRequests().find((r) => r.url.includes("/job-reports/employee"));
    const query = new URL(reportCall?.url ?? "").searchParams;
    expect(query.get("from")).toBe(query.get("to"));
    expect(query.get("from")).toBe(istToday());
  });

  it.each([
    ["7", istShifted(-6)],
    ["this-month", istFirstOfMonth()],
  ] as const)(
    "maps the %s preset to its IST window, not the 30-day default",
    async (preset, from) => {
      defaultState();
      writeSession({ token: "tok-1", name: "Priya" });
      renderMe(`/admin/me?range=${preset}`);
      await card("My job activity");
      const reportCall = sentRequests().find((r) => r.url.includes("/job-reports/employee"));
      const query = new URL(reportCall?.url ?? "").searchParams;
      expect(query.get("from")).toBe(from);
      expect(query.get("to")).toBe(istToday());
    },
  );

  it("degrades a malformed report body to the alert, not a crash", async () => {
    defaultState();
    setRespond((url) =>
      url.includes("/job-reports/employee") ? jsonResponse({}) : respondDefault(url),
    );
    writeSession({ token: "tok-1", name: "Priya" });
    renderMe();
    expect(
      await screen.findByText("Your job activity could not load for this period."),
    ).toBeInTheDocument();
  });

  it("shows no reasons block and no capped note when nothing was rejected yet", async () => {
    defaultState();
    state.report = () =>
      jsonResponse(
        employeeReport({ rejectionReasons: [], rejectionReasonsTotal: 0, approvalRate: null }),
      );
    writeSession({ token: "tok-1", name: "Priya" });
    renderMe();
    const activity = await card("My job activity");
    expect(within(activity).queryByText(/Rejection reasons I received/)).toBeNull();
    expect(within(activity).queryByText(/Showing the .* newest of/)).toBeNull();
    expect(within(activity).getAllByText("—").length).toBeGreaterThanOrEqual(1);
  });

  it("keeps the activity period in the address — the current preset is highlighted", async () => {
    defaultState();
    writeSession({ token: "tok-1", name: "Priya" });
    renderMe("/admin/me?range=7");
    await card("My job activity");
    expect(screen.getByRole("link", { name: "Last 7 days" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("shows an alert when the report slice fails", async () => {
    defaultState();
    setRespond((url) =>
      url.includes("/job-reports/employee") ? jsonResponse({}, 500) : respondDefault(url),
    );
    writeSession({ token: "tok-1", name: "Priya" });
    renderMe();
    expect(
      await screen.findByText("Your job activity could not load for this period."),
    ).toBeInTheDocument();
  });
});
