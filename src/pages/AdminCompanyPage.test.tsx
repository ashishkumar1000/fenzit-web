import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { routes } from "../app/routes";
import { writeSession } from "../services/session";
import {
  resetIdentityCacheForTests,
  setIdentityTtlForTests,
} from "../features/admin/identityCache";
import { istShifted, istToday } from "../features/admin/format";
import type { OwnerReportResponse } from "../features/admin/jobReportsApi";
import type { MemberRow, PulseResponse } from "../features/admin/companyApi";
import {
  clearApiBase,
  installFetchMock,
  jsonResponse,
  restoreFetchMock,
  sentRequests,
  setRespond,
  useApiBase,
} from "../testing/fetchMock";

// The merged overview (2026-11-20): the old /admin dashboard's job report
// became this page's report block, the pulse and links stayed, and the audit
// trail is gone. These render the success path over the real /admin/company
// route so the loader — ownerRange and the four settled slices — is on the
// wire, not bypassed by hand-built props. Ambiguous values ("1", "—") are
// asserted inside their own card, never page-wide.

beforeAll(() => {
  useApiBase();
});

afterAll(() => {
  clearApiBase();
});

let pulseFails: boolean;
let membersFails: boolean;
let leaveFails: boolean;
let reportFails: boolean;
let meFails: boolean;
let reportBody: () => Response | Promise<Response>;
let meHasSubscription: boolean;
/** The /users/me reads this test saw — one per navigation burst under the
 *  shared identity cache (CAP-8): the layout's check and every
 *  requireConsoleRole in the burst share a single answer. */
let meCalls: number;

beforeEach(() => {
  pulseFails = false;
  membersFails = false;
  leaveFails = false;
  reportFails = false;
  meFails = false;
  reportBody = () => jsonResponse(fullReport);
  meHasSubscription = true;
  meCalls = 0;
  installFetchMock();
  setRespond(respondDefault);
});

afterEach(() => {
  restoreFetchMock();
  // The identity cache's TTL knob and entries are module state — a shrunk
  // TTL must never leak into the next test (or the next test file).
  resetIdentityCacheForTests();
  window.localStorage.clear();
  cleanup();
});

function fullMe(): Response {
  return jsonResponse({
    id: "u-owner",
    role: "company_admin",
    name: "Ravi Kumar",
    platformAdmin: false,
    email: null,
    countryCode: "+91",
    phoneNumber: "9900000001",
    employeeCode: null,
    status: "active",
    subscription: meHasSubscription ? { validUntil: "2027-01-31T00:00:00Z" } : null,
  });
}

function respondDefault(url: string): Response | Promise<Response> {
  if (url.endsWith("/users/me")) {
    meCalls += 1;
    if (meFails) return jsonResponse({}, 500);
    return fullMe();
  }
  if (url.includes("/attendance/dashboard")) {
    if (pulseFails) return jsonResponse({}, 500);
    return jsonResponse(fullPulse);
  }
  if (url.endsWith("/members")) {
    if (membersFails) return jsonResponse({}, 500);
    return jsonResponse(fullMembers);
  }
  if (url.includes("/attendance/leave")) {
    if (leaveFails) return jsonResponse({}, 500);
    return jsonResponse(fullLeave);
  }
  if (url.includes("/job-reports/owner")) {
    if (reportFails) return jsonResponse({}, 500);
    return reportBody();
  }
  throw new TypeError(`offline in tests: ${url}`);
}

function renderConsole(entry = "/admin/company") {
  writeSession({ token: "tok-1", name: "Ravi" });
  const router = createMemoryRouter(routes, { initialEntries: [entry] });
  render(<RouterProvider router={router} />);
  return router;
}

const fullPulse: PulseResponse = {
  date: "2026-11-20",
  counts: { tracked: 10, checkedIn: 6, notCheckedIn: 3, shortDay: 1, late: 2, onLeave: 1 },
  flags: { checkoutMissing: ["x"], fakeLocationAttempt: [] },
};

const fullMembers: MemberRow[] = [
  {
    userId: "u-1",
    name: "Priya Nair",
    countryCode: "+91",
    phoneNumber: "9900000002",
    employeeCode: "EMP-001",
    role: "employee",
    status: "active",
    createdAt: "2026-10-21T00:00:00Z",
    canCreateJobs: true,
    jobApprovalRequired: true,
    managerId: null,
    managerName: null,
    chain: [],
    headcount: 0,
    directReports: 0,
  },
  {
    userId: "u-2",
    name: "Amit Sharma",
    countryCode: "+91",
    phoneNumber: "9900000003",
    employeeCode: "EMP-002",
    role: "employee",
    status: "active",
    createdAt: "2026-10-21T00:00:00Z",
    canCreateJobs: false,
    jobApprovalRequired: false,
    managerId: null,
    managerName: null,
    chain: [],
    headcount: 0,
    directReports: 0,
  },
];

const fullLeave = {
  data: [
    {
      id: "lv-1",
      employeeName: "Priya Nair",
      employeeCode: "EMP-001",
      startDate: "2026-11-24",
      endDate: "2026-11-26",
      part: "full",
      reason: "family event",
      status: "pending",
      workingDays: 2,
      totalDays: 3,
    },
  ],
  nextCursor: null,
  hasMore: false,
};

const fullReport: OwnerReportResponse = {
  range: { from: "2026-10-16", to: "2026-11-14" },
  headline: {
    employeeCreated: 12,
    employeeApproved: 7,
    employeeAutoApproved: 2,
    ownerCreated: 5,
  },
  pipeline: {
    pending: 3,
    pendingOverOneDay: 1,
    rejected: 2,
    rejectedWithReason: 1,
    rejectedWithoutReason: 1,
    approvalRate: 0.345,
    averageMinutesToDecision: 1500,
    medianMinutesToDecision: 45,
    oldestPending: { id: "j1", jobNumber: "JOB-9", submittedAt: "2026-11-13T05:00:00Z" },
  },
  perEmployee: [
    {
      employeeId: "e1",
      name: "Priya",
      created: 8,
      approved: 6,
      autoApproved: 1,
      rejected: 1,
      pending: 1,
      cancelled: 0,
      shareOfEmployeeCreated: 0.667,
    },
    {
      employeeId: "e2",
      name: null,
      created: 4,
      approved: 1,
      autoApproved: 1,
      rejected: 1,
      pending: 2,
      cancelled: 0,
      shareOfEmployeeCreated: 0.333,
    },
  ],
  employeesWithPermissionNoJobs: [
    { employeeId: "e3", name: "Amit" },
    { employeeId: "e4", name: null },
  ],
};

function tileOf(label: string): HTMLElement {
  const tile = screen.getByText(label).closest("div[data-tone]");
  if (tile === null) throw new Error(`no tile labelled ${label}`);
  return tile as HTMLElement;
}

function card(name: string): HTMLElement {
  // happy-dom does not compute the implicit region role for <section>, so the
  // card is found by its heading and scoped from there.
  const section = screen.getByRole("heading", { name }).closest("section");
  if (section === null) throw new Error(`no card titled ${name}`);
  return section;
}

describe("AdminCompanyPage: the merged overview's shell", () => {
  it("greets the owner in its own header under the Console›Overview breadcrumb", async () => {
    renderConsole();
    await screen.findByText("Priya");

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Hello, Ravi Kumar");
    expect(screen.getByText("Owner")).toBeInTheDocument();
    expect(screen.getByLabelText("Breadcrumb").textContent).toBe("Console›Overview");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    // The audit trail is gone by owner decision — no card, no endpoint.
    expect(screen.queryByText("Audit trail")).toBeNull();
    expect(sentRequests().some((r) => r.url.includes("/audit"))).toBe(false);
  });

  it("reads /users/me once per burst — the layout's check and the overview loader's role check share the identity (CAP-8)", async () => {
    // Before the shared identity cache this burst made two identical reads,
    // and a test could fail the second to reach the whole-page failure card.
    // One answer now serves both loaders: a failed identity read fails the
    // layout too (its retry screen — covered in AdminPage.test), so that
    // card is only reachable through the overview's own data slices, which
    // degrade per-card above.
    renderConsole();
    await screen.findByText("Priya");

    expect(meCalls).toBe(1);
  });

  it("degrades a dead identity read to the whole-page failure card once the cache has expired", async () => {
    const router = renderConsole();
    await screen.findByText("Priya");

    // Burst 1 cached the identity (CAP-8). Shrink the TTL to 0 so the next
    // burst must re-read it, put the read on the floor, and take a preset
    // link — the loader re-runs and the failed read (not an auth error)
    // settles the whole page as failed.
    setIdentityTtlForTests(0);
    meFails = true;
    fireEvent.click(screen.getByRole("link", { name: /Today/ }));

    expect(await screen.findByText("The company data could not load.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(router.state.location.search).toBe("?range=today");
  });

  it("bounces a member hand-typing the overview address back to their own console", async () => {
    installFetchMock();
    setRespond((url) => {
      if (url.endsWith("/users/me")) {
        return jsonResponse({ id: "u-emp", role: "employee", name: "Priya", platformAdmin: false });
      }
      return jsonResponse({});
    });
    writeSession({ token: "tok-1", name: "Priya" });
    const router = createMemoryRouter(routes, { initialEntries: ["/admin/company"] });
    render(<RouterProvider router={router} />);
    // The gate lands on /admin, whose index forwards a member to Me.
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/admin/me");
    });
  });
});

describe("AdminCompanyPage: today's pulse", () => {
  it("sums today's counts into the six tiles", async () => {
    renderConsole();
    await screen.findByText("Priya");

    expect(within(tileOf("Tracked")).getByText("10")).toBeTruthy();
    expect(within(tileOf("Checked in")).getByText("6")).toBeTruthy();
    expect(within(tileOf("Not checked in")).getByText("3")).toBeTruthy();
    expect(within(tileOf("Short day")).getByText("1")).toBeTruthy();
    expect(within(tileOf("Late")).getByText("2")).toBeTruthy();
    expect(within(tileOf("On leave")).getByText("1")).toBeTruthy();
    // The date line names the pulse's day.
    expect(screen.getByText(/Today, 20 Nov 2026/)).toBeInTheDocument();
  });

  it("carries the flag counts on the date line, pluralising the location attempts", async () => {
    fullPulse.flags = { checkoutMissing: ["a", "b"], fakeLocationAttempt: ["c"] };
    renderConsole();
    await screen.findByText("Priya");

    expect(
      screen.getByText(/2 missing check-out · 1 suspect location attempt$/),
    ).toBeInTheDocument();
  });

  it("degrades a failed pulse to its own retry card; the rest of the page still works", async () => {
    pulseFails = true;
    renderConsole();

    expect(await screen.findByText("The pulse could not load.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    // The report and the links are separate slices — Priya's row and the
    // Employees card are still on the page.
    expect(await screen.findByText("Priya")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Your full team/ })).toBeInTheDocument();
  });
});

describe("AdminCompanyPage: the five link cards", () => {
  it("links every browse section and counts the team on the Employees card", async () => {
    renderConsole();
    await screen.findByText("Priya");

    // The notes keep each card's name unambiguous — the sidebar repeats the
    // bare labels.
    expect(screen.getByRole("link", { name: /Everyone who buys from you/ })).toHaveAttribute(
      "href",
      "/admin/company/customers",
    );
    const employees = screen.getByRole("link", { name: /Your full team/ });
    expect(employees).toHaveAttribute("href", "/admin/company/employees");
    expect(screen.getByRole("link", { name: /Every job, newest first/ })).toHaveAttribute(
      "href",
      "/admin/company/jobs",
    );
    expect(screen.getByRole("link", { name: /Upcoming and past/ })).toHaveAttribute(
      "href",
      "/admin/company/holidays",
    );
    expect(screen.getByRole("link", { name: /This month, per employee/ })).toHaveAttribute(
      "href",
      "/admin/company/attendance",
    );
    // The Employees card carries the member count the loader fetched.
    expect(within(employees).getByText("2 total")).toBeTruthy();
  });
});

describe("AdminCompanyPage: the report numbers (CAP-8)", () => {
  it("renders the four headline counts and the derived rate and waits", async () => {
    renderConsole();
    await screen.findByText("Priya");
    expect(within(tileOf("Created by employees")).getByText("12")).toBeTruthy();
    expect(within(tileOf("Approved by you")).getByText("7")).toBeTruthy();
    expect(within(tileOf("Auto-approved")).getByText("2")).toBeTruthy();
    expect(within(tileOf("Created by you")).getByText("5")).toBeTruthy();
    // rate 0.345 rounds up to 35%; 1500 min is a day, 45 min stays minutes.
    const rate = card("Approval rate");
    expect(within(rate).getByText("35%")).toBeInTheDocument();
    expect(within(rate).getByText("1 d")).toBeInTheDocument();
    expect(within(rate).getByText("45 min")).toBeInTheDocument();
    // The per-employee card names the window the loader resolved — the
    // default 30-day preset, not the report body's own range field.
    expect(card("Per employee").textContent).toContain(`${istShifted(-29)} – ${istToday()}`);
  });

  it("gates the queue link on pending being above zero — and lands on the queue", async () => {
    renderConsole();
    const link = await screen.findByRole("link", { name: "Open the approval queue" });
    // The queue lives on the jobs page's Approval tab — a bare jobs address
    // would open the table, not the queue the label names.
    expect(link).toHaveAttribute("href", "/admin/company/jobs?tab=approval");
  });

  it("names the oldest pending job and the over-24h count", async () => {
    renderConsole();
    await screen.findByText("Priya");
    const queue = card("Approval queue");
    expect(within(queue).getByText("JOB-9")).toBeInTheDocument();
    expect(within(queue).getByText("Waiting over 24 h")).toBeInTheDocument();
    // A Fact renders label then value; a tile renders label then value too —
    // but the Fact's value follows the label, the tile's precedes it.
    expect(within(queue).getByText("Waiting over 24 h").nextElementSibling?.textContent).toBe("1");
  });

  it("renders every per-employee row, naming a nameless employee (no name)", async () => {
    renderConsole();
    await screen.findByText("Priya");
    const table = within(card("Per employee"));
    // The cells in order pin the column mapping — a Created↔Approved swap
    // would otherwise still contain every number.
    const firstRow = table.getByRole("rowheader", { name: "Priya" }).closest("tr");
    expect(table.getByRole("rowheader", { name: "Priya" }).textContent).toBe("Priya");
    expect(
      within(firstRow as HTMLElement)
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    ).toEqual(["8", "6", "1", "1", "1", "67%"]);
    expect(table.getByRole("rowheader", { name: "(no name)" })).toBeInTheDocument();
  });

  it("lists the employees with permission who created nothing", async () => {
    renderConsole();
    await screen.findByText("Priya");
    const cardEl = card("Can create jobs, none created yet");
    expect(within(cardEl).getByText("Amit")).toBeInTheDocument();
    // One (no name) in THIS card — the per-employee table has its own.
    expect(within(cardEl).getAllByText("(no name)").length).toBe(1);
  });
});

describe("AdminCompanyPage: derived-label boundaries", () => {
  function reportWith(overrides: {
    approvalRate?: number | null;
    average?: number | null;
    median?: number | null;
    oldestPending?: OwnerReportResponse["pipeline"]["oldestPending"];
    pending?: number;
    noJobsList?: OwnerReportResponse["employeesWithPermissionNoJobs"];
  }): OwnerReportResponse {
    return {
      ...fullReport,
      pipeline: {
        ...fullReport.pipeline,
        approvalRate: overrides.approvalRate ?? null,
        averageMinutesToDecision: overrides.average ?? null,
        medianMinutesToDecision: overrides.median ?? null,
        oldestPending:
          overrides.oldestPending === undefined
            ? fullReport.pipeline.oldestPending
            : overrides.oldestPending,
        pending: overrides.pending ?? fullReport.pipeline.pending,
      },
      employeesWithPermissionNoJobs: overrides.noJobsList ?? [],
    };
  }

  it("shows an em dash for a null rate, a null wait and no pending job", async () => {
    reportBody = () => jsonResponse(reportWith({ oldestPending: null }));
    renderConsole();
    await screen.findByText("Priya");
    const rate = card("Approval rate");
    expect(within(rate).getAllByText("—").length).toBe(3);
    const queue = card("Approval queue");
    expect(within(queue).getAllByText("—").length).toBe(1);
    expect(within(queue).queryByText("JOB-9")).toBeNull();
  });

  it("prints a genuine zero rate as 0%, not an em dash", async () => {
    reportBody = () => jsonResponse(reportWith({ approvalRate: 0 }));
    renderConsole();
    await screen.findByText("Priya");
    expect(within(card("Approval rate")).getByText("0%")).toBeInTheDocument();
  });

  it("labels waits under an hour in minutes, above in hours", async () => {
    reportBody = () => jsonResponse(reportWith({ average: 45, median: 90 }));
    renderConsole();
    await screen.findByText("Priya");
    const rate = card("Approval rate");
    expect(within(rate).getByText("45 min")).toBeInTheDocument();
    expect(within(rate).getByText("1.5 h")).toBeInTheDocument();
  });

  it("hides the queue link and dashes the oldest job when nothing is pending", async () => {
    // The mock must be faithful to the contract: zero pending sends
    // oldestPending null, not a stale job.
    reportBody = () => jsonResponse(reportWith({ pending: 0, oldestPending: null }));
    renderConsole();
    await screen.findByText("Priya");
    expect(screen.queryByRole("link", { name: "Open the approval queue" })).toBeNull();
    expect(within(card("Approval queue")).getAllByText("—").length).toBe(1);
  });

  it("renders the empty breakdown line when no employee created a job", async () => {
    reportBody = () => jsonResponse({ ...reportWith({ pending: 0 }), perEmployee: [] });
    renderConsole();
    expect(
      await screen.findByText("No employee created a job in this period."),
    ).toBeInTheDocument();
  });

  it("dashes the share cell for a row without a share", async () => {
    reportBody = () =>
      jsonResponse({
        ...fullReport,
        perEmployee: [{ ...fullReport.perEmployee[0], shareOfEmployeeCreated: null }],
      });
    renderConsole();
    await screen.findByText("Priya");
    expect(within(card("Per employee")).getAllByText("—").length).toBe(1);
  });

  it("labels an exactly-one-hour wait in hours, not minutes", async () => {
    reportBody = () => jsonResponse(reportWith({ average: 60 }));
    renderConsole();
    await screen.findByText("Priya");
    expect(within(card("Approval rate")).getByText("1 h")).toBeInTheDocument();
  });

  it("shows the no-permission-jobs quiet line when the list is empty", async () => {
    reportBody = () => jsonResponse(reportWith({}));
    renderConsole();
    await screen.findByText("Priya");
    expect(
      screen.getByText("Every employee with permission created at least one job."),
    ).toBeInTheDocument();
  });
});

describe("AdminCompanyPage: the period nav and the report's failure path", () => {
  it("highlights only the preset the address names", async () => {
    renderConsole("/admin/company?range=7");
    await screen.findByText("Priya");
    expect(screen.getByRole("link", { name: "Last 7 days" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Today" })).not.toHaveAttribute("aria-current");
  });

  it("highlights no preset link for a hand-set custom range", async () => {
    renderConsole("/admin/company?range=custom&from=2026-01-01&to=2026-01-31");
    await screen.findByText("Priya");
    for (const label of ["Today", "Last 7 days", "Last 30 days", "This month", "Last month"]) {
      expect(screen.getByRole("link", { name: label })).not.toHaveAttribute("aria-current");
    }
  });

  it("offers a retry that keeps the custom range instead of falling back", async () => {
    reportFails = true;
    renderConsole("/admin/company?range=custom&from=2026-01-01&to=2026-01-31");
    expect(
      await screen.findByText("The report could not load for this period."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Try again" })).toHaveAttribute(
      "href",
      "/admin/company?range=custom&from=2026-01-01&to=2026-01-31",
    );
    // The failed report is not a failed page: the pulse is a separate slice.
    expect(screen.getByText(/Today, 20 Nov 2026/)).toBeInTheDocument();
  });

  it("degrades a malformed report body to the retry card, the overview still up", async () => {
    reportBody = () => jsonResponse({});
    renderConsole();
    expect(
      await screen.findByText("The report could not load for this period."),
    ).toBeInTheDocument();
    // The degraded card is not a dead console: the sidebar and the pulse
    // are still there.
    expect(screen.getByRole("link", { name: "Jobs" })).toBeInTheDocument();
    expect(screen.getByText(/Today, 20 Nov 2026/)).toBeInTheDocument();
  });

  it("waits through a slow report without dropping the rest of the page", async () => {
    reportBody = () =>
      new Promise((resolve) => setTimeout(() => resolve(jsonResponse(fullReport)), 30));
    renderConsole();
    await waitFor(() => expect(screen.getByText("Priya")).toBeInTheDocument());
    expect(screen.queryByText("The report could not load for this period.")).toBeNull();
  });
});

describe("AdminCompanyPage: the report request on the wire (CAP-8)", () => {
  it("sends the 7-day preset's IST window and the caller's token", async () => {
    renderConsole("/admin/company?range=7");
    await screen.findByText("Priya");
    const call = sentRequests().find((r) => r.url.includes("/job-reports/owner"));
    const query = new URL(call?.url ?? "").searchParams;
    expect(query.get("from")).toBe(istShifted(-6));
    expect(query.get("to")).toBe(istToday());
    expect(call?.headers.get("Authorization")).toBe("Bearer tok-1");
  });

  it("passes a custom range's from and to straight through", async () => {
    renderConsole("/admin/company?range=custom&from=2026-01-01&to=2026-01-31");
    await screen.findByText("Priya");
    const query = new URL(
      sentRequests().find((r) => r.url.includes("/job-reports/owner"))?.url ?? "",
    ).searchParams;
    expect(query.get("from")).toBe("2026-01-01");
    expect(query.get("to")).toBe("2026-01-31");
  });

  it("falls back to the 30-day window for a hand-truncated custom range", async () => {
    renderConsole("/admin/company?range=custom");
    await screen.findByText("Priya");
    const query = new URL(
      sentRequests().find((r) => r.url.includes("/job-reports/owner"))?.url ?? "",
    ).searchParams;
    expect(query.get("from")).toBe(istShifted(-29));
    expect(query.get("to")).toBe(istToday());
  });

  it("rides an old /admin dashboard deep link over with its range intact", async () => {
    // Pre-merge bookmarks and shared links point at /admin?range=… — the
    // owner redirect must keep the query, not land on the default period.
    const router = renderConsole("/admin?range=custom&from=2026-01-01&to=2026-01-31");
    await screen.findByText("Priya");
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/admin/company");
    });
    expect(router.state.location.search).toBe("?range=custom&from=2026-01-01&to=2026-01-31");
    const query = new URL(
      sentRequests().find((r) => r.url.includes("/job-reports/owner"))?.url ?? "",
    ).searchParams;
    expect(query.get("from")).toBe("2026-01-01");
    expect(query.get("to")).toBe("2026-01-31");
  });

  it("clicks a period pill: the address changes, the report refetches for that window, and the layout's check does not re-run", async () => {
    const router = renderConsole("/admin/company");
    await screen.findByText("Priya");
    const meBefore = meCalls; // the burst's single shared identity read

    fireEvent.click(screen.getByRole("link", { name: "Last 7 days" }));

    await waitFor(() => {
      expect(`${router.state.location.pathname}${router.state.location.search}`).toBe(
        "/admin/company?range=7",
      );
    });
    await screen.findByText(/Today, 20 Nov 2026/);
    // The report refetched for the 7-day window — this is the second call.
    const calls = sentRequests().filter((r) => r.url.includes("/job-reports/owner"));
    expect(calls.length).toBe(2);
    const query = new URL(calls[1]?.url ?? "").searchParams;
    expect(query.get("from")).toBe(istShifted(-6));
    expect(query.get("to")).toBe(istToday());
    // The layout's shouldRevalidate declines the non-/admin address, and the
    // overview loader's re-run rides the shared identity cache (CAP-8): the
    // /users/me count does not move.
    expect(meCalls).toBe(meBefore);
  });
});

describe("AdminCompanyPage: leave and subscription", () => {
  it("renders the leave rows and the subscription end from the profile", async () => {
    renderConsole();
    await screen.findByText("Priya");
    const leave = card("Leave");
    expect(within(leave).getByText("Priya Nair")).toBeInTheDocument();
    expect(within(leave).getByText("2 of 3")).toBeInTheDocument();
    expect(screen.getByText("Valid until 31 Jan 2027 (India time).")).toBeInTheDocument();
  });

  it("says the subscription has no end date when the profile carries none", async () => {
    meHasSubscription = false;
    renderConsole();
    await screen.findByText("Priya");
    expect(
      screen.getByText("No end date is set for this company. Contact Fenzit support."),
    ).toBeInTheDocument();
  });

  it("drops only the leave card when leave fails; subscription stays", async () => {
    leaveFails = true;
    renderConsole();
    await screen.findByText("Priya");
    expect(screen.queryByRole("heading", { name: "Leave" })).toBeNull();
    expect(screen.getByRole("heading", { name: "Subscription" })).toBeInTheDocument();
    expect(screen.getByText("Valid until 31 Jan 2027 (India time).")).toBeInTheDocument();
  });
});
