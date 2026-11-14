import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { AdminOwnerDashboard } from "./AdminOwnerDashboard";
import type { OwnerDashboard } from "../features/admin/adminLoader";
import type { OwnerReportResponse } from "../features/admin/jobReportsApi";
import { istShifted, istToday } from "../features/admin/format";
import { routes } from "../app/routes";
import { writeSession } from "../services/session";
import {
  clearApiBase,
  installFetchMock,
  jsonResponse,
  restoreFetchMock,
  sentRequests,
  setRespond,
  useApiBase,
} from "../testing/fetchMock";

// The owner dashboard had only its failure path covered (the console test's
// fetch mock is offline); these render the success path with a real-shaped
// report — the numbers, the queue-link gating, the boundaries of the derived
// labels, and the empty lists. Ambiguous values ("1", "—") are asserted
// inside their own card, never page-wide.

beforeAll(() => {
  useApiBase();
});

afterAll(() => {
  clearApiBase();
});

beforeEach(() => {
  ownerReportBody = () => jsonResponse(fullReport);
  installFetchMock();
  setRespond(respondWire);
});

afterEach(() => {
  restoreFetchMock();
  window.localStorage.clear();
  cleanup();
});

let ownerReportBody: () => Response | Promise<Response>;

function respondWire(url: string): Response | Promise<Response> {
  if (url.endsWith("/users/me")) {
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
    });
  }
  if (url.includes("/job-reports/owner")) return ownerReportBody();
  throw new TypeError(`offline in tests: ${url}`);
}

/** Renders the real /admin route so the layout loader — ownerRange and the
 *  report request — is on the wire, not bypassed by a hand-built prop. */
function renderConsole(entry = "/admin"): void {
  writeSession({ token: "tok-1", name: "Ravi" });
  const router = createMemoryRouter(routes, { initialEntries: [entry] });
  render(<RouterProvider router={router} />);
}

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

function renderDashboard(report: OwnerDashboard["report"], entry = "/admin"): void {
  const router = createMemoryRouter(
    [
      {
        path: "/admin",
        element: (
          <AdminOwnerDashboard dashboard={{ kind: "dashboard", range: fullReport.range, report }} />
        ),
      },
    ],
    { initialEntries: [entry] },
  );
  render(<RouterProvider router={router} />);
}

/** The headline tile carries value above label; read the value off the label. */
function tileValue(label: string): string {
  return screen.getByText(label).previousElementSibling?.textContent ?? "";
}

function card(name: string): HTMLElement {
  // happy-dom does not compute the implicit region role for <section>, so the
  // card is found by its heading and scoped from there.
  const section = screen.getByRole("heading", { name }).closest("section");
  if (section === null) throw new Error(`no card titled ${name}`);
  return section;
}

describe("AdminOwnerDashboard: the report numbers (CAP-8)", () => {
  it("renders the four headline counts and the derived rate and waits", async () => {
    renderDashboard({ ok: true, data: fullReport });
    await screen.findByText("Priya");
    expect(tileValue("Created by employees")).toBe("12");
    expect(tileValue("Approved by you")).toBe("7");
    expect(tileValue("Auto-approved")).toBe("2");
    expect(tileValue("Created by you")).toBe("5");
    // rate 0.345 rounds up to 35%; 1500 min is a day, 45 min stays minutes.
    const rate = card("Approval rate");
    expect(within(rate).getByText("35%")).toBeInTheDocument();
    expect(within(rate).getByText("1 d")).toBeInTheDocument();
    expect(within(rate).getByText("45 min")).toBeInTheDocument();
    // The per-employee card names the window it covers.
    expect(card("Per employee").textContent).toContain("2026-10-16 – 2026-11-14");
  });

  it("gates the queue link on pending being above zero", async () => {
    renderDashboard({ ok: true, data: fullReport });
    expect(
      await screen.findByRole("link", { name: "Open the approval queue" }),
    ).toBeInTheDocument();
  });

  it("names the oldest pending job and the over-24h count", () => {
    renderDashboard({ ok: true, data: fullReport });
    const queue = card("Approval queue");
    expect(within(queue).getByText("JOB-9")).toBeInTheDocument();
    expect(within(queue).getByText("Waiting over 24 h")).toBeInTheDocument();
    // A Fact renders label then value; a headline tile renders value then label.
    expect(within(queue).getByText("Waiting over 24 h").nextElementSibling?.textContent).toBe("1");
  });

  it("renders every per-employee row, naming a nameless employee (no name)", async () => {
    renderDashboard({ ok: true, data: fullReport });
    const table = within(await card("Per employee"));
    // The cells in order pin the column mapping — a Created↔Approved swap
    // would otherwise still contain every number.
    const firstRow = table.getByRole("cell", { name: "Priya" }).closest("tr");
    expect(
      within(firstRow as HTMLElement)
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    ).toEqual(["Priya", "8", "6", "1", "1", "1", "67%"]);
    expect(table.getByRole("cell", { name: "(no name)" })).toBeInTheDocument();
  });

  it("lists the employees with permission who created nothing", () => {
    renderDashboard({ ok: true, data: fullReport });
    const cardEl = card("Can create jobs, none created yet");
    expect(within(cardEl).getByText("Amit")).toBeInTheDocument();
    expect(within(cardEl).getAllByText("(no name)").length).toBe(1);
  });
});

describe("AdminOwnerDashboard: derived-label boundaries", () => {
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

  it("shows an em dash for a null rate, a null wait and no pending job", () => {
    renderDashboard({ ok: true, data: reportWith({ oldestPending: null }) });
    const rate = card("Approval rate");
    expect(within(rate).getAllByText("—").length).toBe(3);
    const queue = card("Approval queue");
    expect(within(queue).getAllByText("—").length).toBe(1);
    expect(within(queue).queryByText("JOB-9")).toBeNull();
  });

  it("prints a genuine zero rate as 0%, not an em dash", () => {
    renderDashboard({ ok: true, data: reportWith({ approvalRate: 0 }) });
    const rate = card("Approval rate");
    expect(within(rate).getByText("0%")).toBeInTheDocument();
  });

  it("labels waits under an hour in minutes, above in hours", () => {
    renderDashboard({ ok: true, data: reportWith({ average: 45, median: 90 }) });
    const rate = card("Approval rate");
    expect(within(rate).getByText("45 min")).toBeInTheDocument();
    expect(within(rate).getByText("1.5 h")).toBeInTheDocument();
  });

  it("hides the queue link and dashes the oldest job when nothing is pending", () => {
    // The mock must be faithful to the contract: zero pending sends
    // oldestPending null, not a stale job.
    renderDashboard({ ok: true, data: reportWith({ pending: 0, oldestPending: null }) });
    expect(screen.queryByRole("link", { name: "Open the approval queue" })).toBeNull();
    expect(within(card("Approval queue")).getAllByText("—").length).toBe(1);
  });

  it("renders the empty breakdown line when no employee created a job", () => {
    const none = { ...reportWith({ pending: 0 }), perEmployee: [] };
    renderDashboard({ ok: true, data: none });
    expect(screen.getByText("No employee created a job in this period.")).toBeInTheDocument();
  });

  it("dashes the share cell for a row without a share", () => {
    const noShare = {
      ...fullReport,
      perEmployee: [{ ...fullReport.perEmployee[0], shareOfEmployeeCreated: null }],
    };
    renderDashboard({ ok: true, data: noShare });
    expect(within(card("Per employee")).getAllByText("—").length).toBe(1);
  });

  it("labels an exactly-one-hour wait in hours, not minutes", () => {
    renderDashboard({ ok: true, data: reportWith({ average: 60 }) });
    expect(within(card("Approval rate")).getByText("1 h")).toBeInTheDocument();
  });

  it("shows the no-permission-jobs quiet line when the list is empty", () => {
    renderDashboard({ ok: true, data: reportWith({}) });
    expect(
      screen.getByText("Every employee with permission created at least one job."),
    ).toBeInTheDocument();
  });
});

describe("AdminOwnerDashboard: the period toggle and failure path", () => {
  it("highlights only the preset the address names", () => {
    renderDashboard({ ok: true, data: fullReport }, "/admin?range=7");
    expect(screen.getByRole("link", { name: "Last 7 days" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Today" })).not.toHaveAttribute("aria-current");
  });

  it("highlights no preset link for a hand-set custom range", () => {
    renderDashboard(
      { ok: true, data: fullReport },
      "/admin?range=custom&from=2026-01-01&to=2026-01-31",
    );
    for (const label of ["Today", "Last 7 days", "Last 30 days", "This month", "Last month"]) {
      expect(screen.getByRole("link", { name: label })).not.toHaveAttribute("aria-current");
    }
  });

  it("offers a retry that keeps the custom range instead of falling back", () => {
    renderDashboard({ ok: false }, "/admin?range=custom&from=2026-01-01&to=2026-01-31");
    expect(screen.getByText("The report could not load for this period.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Try again" })).toHaveAttribute(
      "href",
      "/admin?range=custom&from=2026-01-01&to=2026-01-31",
    );
  });
});

describe("AdminOwnerDashboard: the report request on the wire (CAP-8)", () => {
  it("sends the 7-day preset's IST window and the caller's token", async () => {
    renderConsole("/admin?range=7");
    await screen.findByText("Priya");
    const call = sentRequests().find((r) => r.url.includes("/job-reports/owner"));
    const query = new URL(call?.url ?? "").searchParams;
    expect(query.get("from")).toBe(istShifted(-6));
    expect(query.get("to")).toBe(istToday());
    expect(call?.headers.get("Authorization")).toBe("Bearer tok-1");
  });

  it("passes a custom range's from and to straight through", async () => {
    renderConsole("/admin?range=custom&from=2026-01-01&to=2026-01-31");
    await screen.findByText("Priya");
    const query = new URL(
      sentRequests().find((r) => r.url.includes("/job-reports/owner"))?.url ?? "",
    ).searchParams;
    expect(query.get("from")).toBe("2026-01-01");
    expect(query.get("to")).toBe("2026-01-31");
  });

  it("falls back to the 30-day window for a hand-truncated custom range", async () => {
    renderConsole("/admin?range=custom");
    await screen.findByText("Priya");
    const query = new URL(
      sentRequests().find((r) => r.url.includes("/job-reports/owner"))?.url ?? "",
    ).searchParams;
    expect(query.get("from")).toBe(istShifted(-29));
    expect(query.get("to")).toBe(istToday());
  });

  it("degrades a malformed report body to the retry card, console still up", async () => {
    ownerReportBody = () => jsonResponse({});
    renderConsole();
    expect(
      await screen.findByText("The report could not load for this period."),
    ).toBeInTheDocument();
    // The degraded card is not a dead console: the sidebar is still there.
    expect(screen.getByRole("link", { name: "Approvals" })).toBeInTheDocument();
  });

  it("waits through a slow report without dropping the previous view", async () => {
    ownerReportBody = () =>
      new Promise((resolve) => setTimeout(() => resolve(jsonResponse(fullReport)), 30));
    renderConsole();
    await waitFor(() => expect(screen.getByText("Priya")).toBeInTheDocument());
    expect(screen.queryByText("The report could not load for this period.")).toBeNull();
  });
});
