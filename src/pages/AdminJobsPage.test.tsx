import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

// The shared jobs page for a member (Epic 22): the job panels moved here from
// the Me page — the New job card follows the caller's own create switch, the
// pending card degrades when its slice fails, and the rejected history and
// activity report render with their boundary copy. Every endpoint answers by
// URL, statelessly — the page reloads them wholesale on each navigation.
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

let ownerConsole: boolean;

beforeEach(() => {
  ownerConsole = false;
  installFetchMock();
  setRespond(respondDefault);
});

function jobsPageEnvelope(rows: Record<string, unknown>[]): Response {
  return jsonResponse({
    data: rows,
    total: 30,
    page: 1,
    pageSize: 10,
    pages: 3,
    stats: {
      total: 30,
      scheduled: 18,
      inProgress: 1,
      pendingApproval: 0,
      completed: 5,
      cancelled: 1,
      rejected: 5,
      completed30d: 5,
    },
  });
}

function respondDefault(url: string): Response {
  if (url.endsWith("/users/me")) {
    if (ownerConsole) {
      return jsonResponse({
        id: "u-own",
        role: "company_admin",
        name: "Beta Yela",
        platformAdmin: false,
        email: "beta@example.com",
        countryCode: "+91",
        phoneNumber: "9900000001",
        employeeCode: null,
        status: "active",
      });
    }
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
  if (url.includes("/jobs/page")) return jobsPageEnvelope([ownerJobRow()]);
  if (url.endsWith("/skills")) return jsonResponse({ skills: [{ id: "s-1", name: "AC Service" }] });
  // The owner Activity tab's feed: one real alert so the tab renders content.
  if (url.includes("/notifications")) {
    return jsonResponse({
      data: [
        {
          id: "n-1",
          jobId: "j-9",
          eventType: "job.submitted",
          payload: {
            job_number: "JOB-21",
            employee_name: "Priya Nair",
            customer_name: "Sharma Traders",
          },
          readAt: null,
          createdAt: "2026-11-19T10:00:00+05:30",
        },
      ],
    });
  }
  // The owner Report tab's history and employee roster — empty but well-formed.
  if (url.includes("/reports")) return jsonResponse({ data: [] });
  if (url.endsWith("/members")) return jsonResponse({ data: [] });
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
  if (url.includes("/approval-queue/mine")) return page(state.pending, state.pendingMore);
  if (url.includes("/job-reports/employee")) return state.report();
  // The shared table merges the first page of every timeline scope.
  if (url.includes("/jobs?scope=")) return page(state.jobs);
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
  jobs: unknown[];
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
    description: "AC not cooling",
    scheduledStart: null,
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

function jobRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "j-1",
    jobNumber: "JB-2026-0008",
    status: "completed",
    priority: null,
    scheduledStart: "2026-11-12T03:30:00Z",
    currentStep: "completed",
    skill: { id: "s-1", name: "Pipe Leak Repair" },
    // The additive list-row contract (Epic 23 enrichment): the work, the
    // location, the provenance and the workflow position ride every row.
    description: null,
    serviceLocation: "12 Nehru Road",
    completedAt: null,
    createdAt: "2026-11-12T02:00:00Z",
    decidedAt: null,
    rejectionReason: null,
    currentStepIndex: null,
    workflowTemplate: null,
    ...overrides,
  };
}

function ownerJobRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "j-1",
    jobNumber: "JB-2026-0030",
    status: "scheduled",
    priority: "normal",
    scheduledStart: "2026-11-20T09:00:00+05:30",
    currentStep: null,
    currentStepIndex: null,
    skill: { id: "s-1", name: "AC Service" },
    technician: { id: "u-1", name: "Amit Sharma" },
    customer: { id: "c-1", name: "Sharma General Store" },
    description: "Split AC not cooling",
    serviceLocation: "Nehru Road",
    completedAt: null,
    createdAt: "2026-11-19T10:00:00+05:30",
    decidedAt: null,
    rejectionReason: null,
    workflowTemplate: null,
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

function renderJobs(entry = "/admin/company/jobs"): void {
  const router = createMemoryRouter(routes, { initialEntries: [entry] });
  render(<RouterProvider router={router} />);
}

/** The member report and rejected tests render on their own tabs — each tab
 *  fetches only its own data now. */
function renderReport(): void {
  renderJobs("/admin/company/jobs?tab=report");
}
function renderRejected(): void {
  renderJobs("/admin/company/jobs?tab=rejected");
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
    jobs: [jobRow()],
    report: () => jsonResponse(employeeReport()),
  };
}

describe("AdminJobsPage: the New job card follows the create switch (CAP-2)", () => {
  it("shows the card with the waiting copy when creation needs approval", async () => {
    defaultState();
    writeSession({ token: "tok-1", name: "Priya" });
    renderJobs();
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
    renderJobs();
    await card("New job");
    expect(screen.getByText(/it is assigned to you at once/)).toBeInTheDocument();
  });

  it("shows no New job card at all when the switch is off", async () => {
    defaultState();
    state.canCreateJobs = false;
    writeSession({ token: "tok-1", name: "Priya" });
    renderJobs();
    // The Jobs tab's own heading — the report tab is a separate address now.
    await card("Jobs");
    expect(screen.queryByText("New job")).toBeNull();
  });
});

describe("AdminJobsPage: my pending submissions (CAP-4)", () => {
  it("lists each waiting job with its customer and age, and counts beyond one page", async () => {
    defaultState();
    state.pending = [
      pendingRow(),
      pendingRow({ id: "p2", jobNumber: "JOB-18", customerName: null, description: "Fan repair" }),
    ];
    state.pendingMore = true;
    writeSession({ token: "tok-1", name: "Priya" });
    renderJobs();
    const pending = await card("Waiting for approval");
    // The work leads the row now (critique 2026-11-14); the job number rides
    // beside it and the wait reads as days.
    expect(within(pending).getByText(/AC not cooling/)).toBeInTheDocument();
    expect(within(pending).getByText(/JOB-21/)).toBeInTheDocument();
    expect(within(pending).getByText(/Sharma Traders/)).toBeInTheDocument();
    expect(within(pending).getByText(/no customer/)).toBeInTheDocument();
    expect(within(pending).getAllByText(/waiting 1 d/).length).toBe(2);
    expect(within(pending).getByText("2+ waiting")).toBeInTheDocument();
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
    renderJobs();
    expect(
      await screen.findByText(/Your waiting-for-approval list could not load/),
    ).toBeInTheDocument();
  });

  it("shows no pending card at all when the list is empty, even with more pages", async () => {
    defaultState();
    state.pending = [];
    state.pendingMore = true;
    writeSession({ token: "tok-1", name: "Priya" });
    renderJobs();
    // The Jobs tab's own heading — the report tab is a separate address now.
    await card("Jobs");
    expect(screen.queryByText("Waiting for approval")).toBeNull();
    expect(screen.queryByText("Older submissions follow on the next pages.")).toBeNull();
  });
});

describe("AdminJobsPage: my rejected jobs, all time (CAP-7)", () => {
  it("renders the history with a reason and the no-reason fallback", async () => {
    defaultState();
    writeSession({ token: "tok-1", name: "Priya" });
    renderRejected();
    const rejected = await card("My rejected jobs");
    expect(within(rejected).getByText("JOB-11")).toBeInTheDocument();
    expect(within(rejected).getByText("Customer rescheduled")).toBeInTheDocument();
  });

  it("says no reason was given when the owner declined without one", async () => {
    defaultState();
    state.rejected = [rejectedRow({ rejectionReason: null })];
    writeSession({ token: "tok-1", name: "Priya" });
    renderRejected();
    await card("My rejected jobs");
    expect(screen.getAllByText("No reason given").length).toBeGreaterThanOrEqual(1);
  });

  it("links the older page when more exist beyond the first fifty", async () => {
    defaultState();
    state.rejectedMore = true;
    writeSession({ token: "tok-1", name: "Priya" });
    renderRejected();
    await card("My rejected jobs");
    expect(screen.getByText("1+")).toBeInTheDocument();
    // The link keeps its tab and the activity period: walking the rejected
    // history must not reset either.
    expect(screen.getByRole("link", { name: "Load older rejections" })).toHaveAttribute(
      "href",
      "/admin/company/jobs?tab=rejected&range=30&rejectedCursor=c-next",
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
    renderRejected();
    await card("My rejected jobs");
    expect(screen.getByText("1+")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Load older rejections" })).toBeNull();
  });

  it("shows the empty line when nothing of mine was rejected", async () => {
    defaultState();
    state.rejected = [];
    writeSession({ token: "tok-1", name: "Priya" });
    renderRejected();
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
    renderRejected();
    expect(await screen.findByText(/Your rejected jobs could not load/)).toBeInTheDocument();
  });

  it("renders em dashes for a rejection without instants", async () => {
    defaultState();
    state.rejected = [rejectedRow({ decidedAt: null, scheduledStart: null })];
    writeSession({ token: "tok-1", name: "Priya" });
    renderRejected();
    const rejected = await card("My rejected jobs");
    expect(within(rejected).getAllByText("—").length).toBe(2);
  });

  it("carries the rejected cursor into the request, not just the link", async () => {
    defaultState();
    writeSession({ token: "tok-1", name: "Priya" });
    renderJobs("/admin/company/jobs?rejectedCursor=c-next");
    await card("My rejected jobs");
    const rejectedCall = sentRequests().find((r) => r.url.includes("scope=all&status=rejected"));
    expect(new URL(rejectedCall?.url ?? "").searchParams.get("cursor")).toBe("c-next");
  });
});

describe("AdminJobsPage: my job activity (CAP-8)", () => {
  it("renders the outcome tiles, the rates and the capped-reasons note", async () => {
    defaultState();
    writeSession({ token: "tok-1", name: "Priya" });
    renderReport();
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
    renderJobs("/admin/company/jobs?range=today");
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
      renderJobs(`/admin/company/jobs?range=${preset}`);
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
    renderReport();
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
    renderReport();
    const activity = await card("My job activity");
    expect(within(activity).queryByText(/Rejection reasons I received/)).toBeNull();
    expect(within(activity).queryByText(/Showing the .* newest of/)).toBeNull();
    expect(within(activity).getAllByText("—").length).toBeGreaterThanOrEqual(1);
  });

  it("keeps the activity period in the address — the current preset is highlighted", async () => {
    defaultState();
    writeSession({ token: "tok-1", name: "Priya" });
    renderJobs("/admin/company/jobs?range=7");
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
    renderReport();
    expect(
      await screen.findByText("Your job activity could not load for this period."),
    ).toBeInTheDocument();
  });
});

describe("AdminJobsPage: the shared table for a member", () => {
  it("lists my own jobs from the timeline scopes in the common columns", async () => {
    defaultState();
    writeSession({ token: "tok-1", name: "Priya" });
    renderJobs();
    const jobs = await card("Jobs");
    expect(within(jobs).getByText("JB-2026-0008")).toBeInTheDocument();
    expect(within(jobs).getByText("Pipe Leak Repair")).toBeInTheDocument();
    // The server self-scopes: the browser sends no technician filter. Four
    // timeline calls (the rejected-history call is scope=all, filtered out).
    const jobsCall = sentRequests().filter(
      (r) => r.url.includes("/jobs?scope=") && !r.url.includes("status=rejected"),
    );
    expect(jobsCall.length).toBe(4);
    for (const call of jobsCall) {
      expect(new URL(call.url).searchParams.get("technicianId")).toBeNull();
    }
  });

  it("shows the empty line when I have no jobs at all", async () => {
    defaultState();
    state.jobs = [];
    writeSession({ token: "tok-1", name: "Priya" });
    renderJobs();
    const jobs = await card("Jobs");
    expect(within(jobs).getByText("No jobs yet.")).toBeInTheDocument();
  });
});

describe("AdminJobsPage: the shared table's chips, sort and search", () => {
  it("sends the status chip as one server-filtered call and still lists its rows", async () => {
    defaultState();
    writeSession({ token: "tok-1", name: "Priya" });
    renderJobs("/admin/company/jobs?tab=jobs&status=scheduled");
    const jobs = await card("Jobs");
    const call = sentRequests().find((r) => r.url.includes("/jobs?scope="));
    const query = new URL(call?.url ?? "").searchParams;
    expect(query.get("status")).toBe("scheduled");
    expect(query.get("scope")).toBe("all");
    expect(within(jobs).getByText("JB-2026-0008")).toBeInTheDocument();
  });

  it("sorts soonest first and keeps the not-yet-scheduled last", async () => {
    defaultState();
    state.jobs = [
      jobRow({ id: "j-late", jobNumber: "JB-20", scheduledStart: "2026-11-20T03:30:00Z" }),
      jobRow({ id: "j-none", jobNumber: "JB-30", scheduledStart: null }),
      jobRow({ id: "j-soon", jobNumber: "JB-10", scheduledStart: "2026-11-10T03:30:00Z" }),
    ];
    writeSession({ token: "tok-1", name: "Priya" });
    renderJobs("/admin/company/jobs?tab=jobs&sort=soonest");
    const jobs = await card("Jobs");
    // A job without a start is "no date yet", not "the earliest possible".
    expect(
      within(jobs)
        .getAllByText(/^JB-\d+$/)
        .map((n) => n.textContent),
    ).toEqual(["JB-10", "JB-20", "JB-30"]);
  });

  it("narrows the rows to the search box's words, and says when nothing matches", async () => {
    defaultState();
    state.jobs = [jobRow(), jobRow({ id: "j-2", jobNumber: "JB-9", serviceLocation: "MG Road" })];
    writeSession({ token: "tok-1", name: "Priya" });
    renderJobs();
    await card("Jobs");
    fireEvent.change(screen.getByLabelText("Search jobs"), { target: { value: "Nehru" } });
    expect(screen.getByText("1 of 2 jobs")).toBeInTheDocument();
    expect(screen.getByText("JB-2026-0008")).toBeInTheDocument();
    expect(screen.queryByText("JB-9")).toBeNull();
    fireEvent.change(screen.getByLabelText("Search jobs"), { target: { value: "nowhere" } });
    expect(screen.getByText("No job matches that search.")).toBeInTheDocument();
  });

  it("reads a rejected job's work as its title and keeps its number beside the reason", async () => {
    defaultState();
    state.jobs = [
      jobRow({ status: "rejected", description: "AC service", rejectionReason: "Bad work" }),
    ];
    writeSession({ token: "tok-1", name: "Priya" });
    renderJobs();
    const jobs = await card("Jobs");
    expect(within(jobs).getByText("AC service")).toBeInTheDocument();
    // The description leads, so the number rides the reason — the row must
    // never lose the only thing that names which job it is.
    expect(within(jobs).getByText("Bad work · JB-2026-0008")).toBeInTheDocument();
  });

  it("names the step of the template while the job is on it", async () => {
    defaultState();
    state.jobs = [
      jobRow({ currentStepIndex: 1, workflowTemplate: { steps: [{}, {}, {}, {}, {}] } }),
    ];
    writeSession({ token: "tok-1", name: "Priya" });
    renderJobs();
    const jobs = await card("Jobs");
    expect(within(jobs).getByText("Step 2 of 5")).toBeInTheDocument();
  });

  it("never reads Step 6 of 5 when the template shrank under the job", async () => {
    defaultState();
    state.jobs = [
      jobRow({
        currentStepIndex: 5,
        currentStep: "completed",
        workflowTemplate: { steps: [{}, {}, {}, {}, {}] },
      }),
    ];
    writeSession({ token: "tok-1", name: "Priya" });
    renderJobs();
    const jobs = await card("Jobs");
    // Both the status cell and the step cell read "Completed" — the step
    // cell must never read "Step 6 of 5".
    expect(within(jobs).getAllByText("Completed").length).toBeGreaterThanOrEqual(1);
    expect(within(jobs).queryByText(/Step \d+ of 5/)).toBeNull();
  });
});

describe("AdminJobsPage: the owner's console jobs tab", () => {
  /** The owner greeting + paged table, awaited. */
  async function renderOwnerJobs(entry = "/admin/company/jobs"): Promise<void> {
    ownerConsole = true;
    writeSession({ token: "tok-1", name: "Beta" });
    renderJobs(entry);
    await screen.findByText("Split AC not cooling");
  }

  it("greets the owner, wears the Owner pill and breadcrumbs the console with a single h1", async () => {
    await renderOwnerJobs();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Hello, Beta Yela");
    expect(screen.getByText("Owner")).toBeTruthy();
    expect(screen.getByLabelText("Breadcrumb").textContent).toBe("Console›Jobs");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("shows the four tiles and the whole-company counts on the status chips", async () => {
    await renderOwnerJobs();
    for (const tile of ["Total jobs", "In progress", "Job approvals", "Completed (30 days)"]) {
      // "In progress" is both a tile label and a status chip — any hit counts.
      expect(screen.getAllByText(tile).length).toBeGreaterThanOrEqual(1);
    }
    const group = screen.getByRole("group", { name: "Filter jobs by status" });
    expect(group.textContent).toContain("All30");
    expect(group.textContent).toContain("Scheduled18");
    expect(group.textContent).toContain("Pending approval0");
    expect(group.textContent).toContain("Rejected5");
  });

  it("renders the row: work, number, customer, place, status, skill, employee", async () => {
    await renderOwnerJobs();
    const row = screen.getByText("Split AC not cooling").closest("tr");
    expect(row?.textContent).toContain("JB-2026-0030");
    expect(row?.textContent).toContain("Sharma General Store");
    expect(row?.textContent).toContain("Nehru Road");
    expect(row?.textContent).toContain("AC Service");
    expect(row?.textContent).toContain("Amit Sharma");
  });

  it("reads the DB-paged endpoint, never the four-scope merge, and fetches the skill catalog", async () => {
    await renderOwnerJobs();
    expect(sentRequests().filter((r) => r.url.includes("/jobs/page")).length).toBe(1);
    expect(sentRequests().some((r) => r.url.includes("/jobs?scope="))).toBe(false);
    expect(sentRequests().some((r) => r.url.endsWith("/skills"))).toBe(true);
  });

  it("says what is showing and offers the pager", async () => {
    await renderOwnerJobs();
    expect(screen.getByText(/Showing 1–10 of 30 jobs/)).toBeTruthy();
    expect(screen.getByLabelText("Pages")).toBeTruthy();
  });

  it("turns a search submit into a paged call carrying the term", async () => {
    await renderOwnerJobs();
    const input = screen.getByLabelText("Search jobs");
    fireEvent.change(input, { target: { value: "leak" } });
    fireEvent.submit(input.closest("form")!);
    await waitFor(() => {
      const paged = sentRequests().filter((r) => r.url.includes("/jobs/page"));
      expect(paged.some((r) => new URL(r.url).searchParams.get("search") === "leak")).toBe(true);
    });
  });

  it("a status chip click navigates with the status param", async () => {
    await renderOwnerJobs();
    const group = screen.getByRole("group", { name: "Filter jobs by status" });
    const completed = Array.from(group.querySelectorAll("a")).find((a) =>
      (a.textContent ?? "").startsWith("Completed"),
    );
    fireEvent.click(completed!);
    await waitFor(() => {
      const paged = sentRequests().filter((r) => r.url.includes("/jobs/page"));
      expect(paged.some((r) => new URL(r.url).searchParams.get("status") === "completed")).toBe(
        true,
      );
    });
  });

  it("both the banner and the greeting offer the one create path", async () => {
    await renderOwnerJobs();
    const links = screen.getAllByRole("link", { name: "Create a job" });
    expect(links.length).toBe(2);
    for (const link of links) expect(link.getAttribute("href")).toBe("/admin/company/jobs/new");
    expect(screen.getByRole("button", { name: /Download list/ })).toBeTruthy();
  });

  it("an empty filtered view says so and keeps the pager; an empty company says create one", async () => {
    ownerConsole = true;
    writeSession({ token: "tok-1", name: "Beta" });
    setRespond((url) =>
      url.includes("/jobs/page")
        ? jsonResponse({
            data: [],
            total: 0,
            page: 1,
            pageSize: 10,
            pages: 1,
            stats: {
              total: 0,
              scheduled: 0,
              inProgress: 0,
              pendingApproval: 0,
              completed: 0,
              cancelled: 0,
              rejected: 0,
              completed30d: 0,
            },
          })
        : respondDefault(url),
    );
    renderJobs();
    expect(await screen.findByText(/No jobs yet. Create the first one/)).toBeTruthy();

    // A filtered view whose total is non-zero keeps the pager: the empty
    // page may simply be past the last one.
    setRespond((url) =>
      url.includes("/jobs/page")
        ? jsonResponse({
            data: [],
            total: 30,
            page: 99,
            pageSize: 10,
            pages: 3,
            stats: {
              total: 30,
              scheduled: 18,
              inProgress: 1,
              pendingApproval: 0,
              completed: 5,
              cancelled: 1,
              rejected: 5,
              completed30d: 5,
            },
          })
        : respondDefault(url),
    );
    renderAt2("/admin/company/jobs?page=99");
    expect(await screen.findByText(/No jobs match these filters/)).toBeTruthy();
    expect(screen.getByLabelText("Pages")).toBeTruthy();
  });

  it("the Jobs tab wears the whole-company total as its badge", async () => {
    await renderOwnerJobs();
    expect(screen.getByRole("link", { name: "Jobs 30" })).toBeTruthy();
  });

  it("the pager's next page and go-to keep the active filters on the address", async () => {
    ownerConsole = true;
    writeSession({ token: "tok-1", name: "Beta" });
    renderJobs("/admin/company/jobs?status=scheduled");
    await screen.findByText("Split AC not cooling");
    fireEvent.click(screen.getByLabelText("Next page"));
    await waitFor(() => {
      const paged = sentRequests().filter((r) => r.url.includes("/jobs/page"));
      const target = paged.find((r) => new URL(r.url).searchParams.get("page") === "2");
      expect(target).toBeTruthy();
      expect(new URL(target!.url).searchParams.get("status")).toBe("scheduled");
    });
    // The go-to form rejects a page outside the real range, then jumps.
    const input = screen.getByLabelText("Go to page");
    fireEvent.change(input, { target: { value: "9" } });
    fireEvent.submit(input.closest("form")!);
    expect(await screen.findByText("Enter a page from 1 to 3.")).toBeTruthy();
    fireEvent.change(input, { target: { value: "3" } });
    fireEvent.submit(input.closest("form")!);
    await waitFor(() => {
      const paged = sentRequests().filter((r) => r.url.includes("/jobs/page"));
      expect(paged.some((r) => new URL(r.url).searchParams.get("page") === "3")).toBe(true);
    });
  });

  it("a skill the catalog doesn't list says Chosen skill, never All", async () => {
    ownerConsole = true;
    writeSession({ token: "tok-1", name: "Beta" });
    renderJobs("/admin/company/jobs?skill=s-9");
    await screen.findByText("Split AC not cooling");
    expect(screen.getByRole("button", { name: "Skill: Chosen skill" })).toBeTruthy();
    // And the filter still rides the paged call.
    const paged = sentRequests().filter((r) => r.url.includes("/jobs/page"));
    expect(new URL(paged[0].url).searchParams.get("skillId")).toBe("s-9");
  });

  it("the owner's Activity tab renders the feed under the same shell", async () => {
    ownerConsole = true;
    writeSession({ token: "tok-1", name: "Beta" });
    renderJobs("/admin/company/jobs?tab=activity");
    expect(await screen.findByText("Latest job activity")).toBeTruthy();
    expect(screen.getByText("Priya Nair submitted JOB-21 for Sharma Traders")).toBeTruthy();
    // The rewritten non-jobs branch keeps the greeting and the tab strip.
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Hello, Beta Yela");
    expect(screen.getByLabelText("Page sections").textContent).toContain("Approval");
  });

  it("the owner's Report tab renders the report card under the same shell", async () => {
    ownerConsole = true;
    writeSession({ token: "tok-1", name: "Beta" });
    renderJobs("/admin/company/jobs?tab=report");
    expect(await screen.findByText("Job activity report")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Hello, Beta Yela");
    expect(screen.getByLabelText("Page sections").textContent).toContain("Activity");
  });
});

describe("AdminJobsPage: a failed load keeps the role's tab strip", () => {
  it("a failed member load shows the member's tabs, never the owner's", async () => {
    defaultState();
    setRespond((url) =>
      url.includes("/jobs?scope=") ? jsonResponse({}, 500) : respondDefault(url),
    );
    writeSession({ token: "tok-1", name: "Priya" });
    renderJobs();
    expect(await screen.findByText("The job list could not load.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "My report" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Approval" })).toBeNull();
  });
});

/** A second render in the same file must clean up first — the helper keeps
 *  the navigation entry honest for follow-up renders in one test. */
function renderAt2(path: string): void {
  cleanup();
  renderJobs(path);
}
