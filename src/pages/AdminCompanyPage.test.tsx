import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { mock } from "bun:test";
import type { ComponentType } from "react";
// Captured BEFORE the module mock below patches the registry — this file's
// afterAll re-registers it, so the stub cannot leak into later test files
// in the same bun process (TrendChart.test.tsx mounts the real component).

/** The TrendChart calls this file's stub receives, per render, newest last. */
const chartCalls: Array<Record<string, unknown>> = [];

mock.module("../features/admin/components/TrendChart", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the stub mirrors the real component's props loosely
  TrendChart: ((props: any) => {
    chartCalls.push(props);
    return <div data-testid="trend-chart" aria-label={props.ariaLabel} />;
  }) as ComponentType,
}));

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";

let routes: typeof import("../app/routes").routes;
import { writeSession } from "../services/session";
import {
  resetIdentityCacheForTests,
  setIdentityTtlForTests,
} from "../features/admin/identityCache";
import { istShifted, istToday } from "../features/admin/format";
import type { OwnerExecReportResponse } from "../features/admin/jobReportsApi";
import type { AttendanceTrendResponse } from "../features/admin/companyApi";
import {
  clearApiBase,
  installFetchMock,
  jsonResponse,
  restoreFetchMock,
  sentRequests,
  setRespond,
  useApiBase,
} from "../testing/fetchMock";

// The executive dashboard (2026-11-27 revamp): the subscription banner and
// three chart cards — the workforce row leads, then the attendance and
// job-flow charts — render over the real /admin/company route, so the
// loader (ownerRange and the two settled slices) is on the wire, not
// bypassed by hand-built props. The 2026-11-28 slimming makes the owner
// report light by default; this page is the one caller that asks for
// `charts=true`, and the wire tests pin that. Ambiguous values are asserted
// inside their own card, never page-wide.

beforeAll(async () => {
  useApiBase();
  // The routes graph imports the page, which imports the real TrendChart —
  // load it only after the mock above is in place.
  ({ routes } = await import("../app/routes"));
});

afterAll(() => {
  clearApiBase();
});

let trendFails: boolean;
let reportFails: boolean;
let meFails: boolean;
let reportBody: () => Response | Promise<Response>;
let trendBody: () => Response | Promise<Response>;
let meHasSubscription: boolean;
/** The /users/me reads this test saw — one per navigation burst under the
 *  shared identity cache (CAP-8): the layout's check and every
 *  requireConsoleRole in the burst share a single answer. */
let meCalls: number;

beforeEach(() => {
  trendFails = false;
  reportFails = false;
  meFails = false;
  reportBody = () => jsonResponse(fullReport);
  trendBody = () => jsonResponse(fullTrend);
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
  if (url.includes("/job-reports/owner")) {
    if (reportFails) return jsonResponse({}, 500);
    return reportBody();
  }
  if (url.includes("/attendance/trend")) {
    if (trendFails) return jsonResponse({}, 500);
    return trendBody();
  }
  throw new TypeError(`offline in tests: ${url}`);
}

function renderConsole(entry = "/admin/company") {
  writeSession({ token: "tok-1", name: "Ravi" });
  const router = createMemoryRouter(routes, { initialEntries: [entry] });
  render(<RouterProvider router={router} />);
  return router;
}

/** The exec report: the light report's fields plus the two chart sections —
 *  exactly what `?charts=true` adds on the wire. */
const fullReport: OwnerExecReportResponse = {
  range: { from: "2026-11-08", to: "2026-11-14" },
  headline: {
    employeeCreated: 12,
    employeeApproved: 7,
    employeeAutoApproved: 2,
    ownerCreated: 5,
  },
  pipeline: { pending: 3 },
  trend: {
    buckets: [
      {
        from: "2026-11-08",
        to: "2026-11-09",
        employeeCreated: 3,
        employeeApproved: 1,
        employeeAutoApproved: 0,
        ownerCreated: 1,
      },
      {
        from: "2026-11-10",
        to: "2026-11-10",
        employeeCreated: 6,
        employeeApproved: 3,
        employeeAutoApproved: 1,
        ownerCreated: 2,
      },
      {
        from: "2026-11-11",
        to: "2026-11-11",
        employeeCreated: 9,
        employeeApproved: 5,
        employeeAutoApproved: 1,
        ownerCreated: 3,
      },
      {
        from: "2026-11-12",
        to: "2026-11-13",
        employeeCreated: 11,
        employeeApproved: 6,
        employeeAutoApproved: 2,
        ownerCreated: 4,
      },
      {
        from: "2026-11-14",
        to: "2026-11-14",
        employeeCreated: 12,
        employeeApproved: 7,
        employeeAutoApproved: 2,
        ownerCreated: 5,
      },
    ],
    turnaroundEfficiency: 0.345,
  },
  workforce: {
    buckets: [
      {
        from: "2026-11-08",
        to: "2026-11-09",
        totalEmployees: 7,
        activeEmployees: 6,
        pendingInvites: 1,
        needsApproval: 1,
      },
      {
        from: "2026-11-10",
        to: "2026-11-10",
        totalEmployees: 7,
        activeEmployees: 6,
        pendingInvites: 1,
        needsApproval: 2,
      },
      {
        from: "2026-11-11",
        to: "2026-11-11",
        totalEmployees: 8,
        activeEmployees: 7,
        pendingInvites: 1,
        needsApproval: 2,
      },
      {
        from: "2026-11-12",
        to: "2026-11-13",
        totalEmployees: 8,
        activeEmployees: 7,
        pendingInvites: 1,
        needsApproval: 3,
      },
      {
        from: "2026-11-14",
        to: "2026-11-14",
        totalEmployees: 8,
        activeEmployees: 7,
        pendingInvites: 1,
        needsApproval: 3,
      },
    ],
  },
};

const fullTrend: AttendanceTrendResponse = {
  range: { from: "2026-11-08", to: "2026-11-09" },
  days: [
    {
      date: "2026-11-08",
      tracked: 10,
      checkedIn: 6,
      notCheckedIn: 3,
      shortDay: 1,
      late: 2,
      onLeave: 1,
    },
    {
      date: "2026-11-09",
      tracked: 6,
      checkedIn: 4,
      notCheckedIn: 1,
      shortDay: 0,
      late: 1,
      onLeave: 0,
    },
  ],
};

function card(name: string): HTMLElement {
  // happy-dom does not compute the implicit region role for <article>, so
  // the card is found by its heading and scoped from there.
  const section = screen.getByRole("heading", { name }).closest("article");
  if (section === null) throw new Error(`no card titled ${name}`);
  return section as HTMLElement;
}

describe("AdminCompanyPage: the exec dashboard's shell", () => {
  it("greets the owner in its own header under the Console›Overview breadcrumb", async () => {
    renderConsole();
    await screen.findByText(/Valid until/);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Hello, Ravi Kumar");
    expect(screen.getByText("Owner")).toBeInTheDocument();
    expect(screen.getByLabelText("Breadcrumb").textContent).toBe("Console›Overview");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("reads /users/me once per burst — the layout's check and the overview loader's role check share the identity (CAP-8)", async () => {
    renderConsole();
    await screen.findByText(/Valid until/);

    expect(meCalls).toBe(1);
  });

  it("degrades a dead identity read to the whole-page failure card once the cache has expired", async () => {
    const router = renderConsole();
    await screen.findByText(/Valid until/);

    // Burst 1 cached the identity (CAP-8). Shrink the TTL to 0 so the next
    // burst must re-read it, put the read on the floor, and take a preset
    // link — the loader re-runs and the failed read (not an auth error)
    // settles the whole page as failed.
    setIdentityTtlForTests(0);
    meFails = true;
    fireEvent.click(screen.getAllByRole("link", { name: "7D" })[0] as HTMLElement);

    expect(await screen.findByText("The company data could not load.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(router.state.location.search).toBe("?range=7");
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

describe("AdminCompanyPage: the three chart cards", () => {
  it("renders the workforce card first, then the two flow charts side by side", async () => {
    renderConsole();
    await screen.findByText(/Valid until/);

    const titles = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(titles).toEqual([
      "Employee Overview & Analytics",
      "Attendance Trend",
      "Jobs & Approvals",
    ]);
    // The trim's promise: the old tiles, tables and link cards are gone.
    expect(screen.queryByRole("heading", { name: "Per employee" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Approval queue" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Approval rate" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Today's pulse" })).toBeNull();
  });

  it("names the loader-resolved window in every card's date pill", async () => {
    renderConsole("/admin/company?range=custom&from=2026-01-01&to=2026-01-31");
    await screen.findByText(/Valid until/);

    // Literal, not recomputed: the same function rendering the pill must
    // not grade its own homework (BMAD review 2026-11-28).
    expect(screen.getAllByText("1 Jan – 31 Jan")).toHaveLength(3);
  });

  it("reads the workforce legend from the last bucket and the rate from it too", async () => {
    renderConsole();
    await screen.findByText(/Valid until/);

    const workforce = card("Employee Overview & Analytics");
    // Each chip's accessible name carries its value: the last bucket's
    // counts read straight off the legend.
    for (const chip of [
      "Total Employees (8)",
      "Active Employees (7)",
      "Pending Invites (1)",
      "Needs Approval (3)",
    ]) {
      expect(within(workforce).getByRole("button", { name: chip })).toBeInTheDocument();
    }
    // 7 of 8 active — one decimal, mock style.
    expect(within(workforce).getByText("Active workforce rate:")).toBeInTheDocument();
    expect(within(workforce).getByText("87.5%")).toBeTruthy();
    expect(within(workforce).getByRole("link", { name: "Manage Employees" })).toHaveAttribute(
      "href",
      "/admin/company/employees",
    );
  });

  it("reads the attendance legend's peak, averages and sums off the fetched days", async () => {
    renderConsole();
    await screen.findByText(/Valid until/);

    const attendance = card("Attendance Trend");
    // The chip names carry the derived values: the team size is the busiest
    // day's tracked count, the buckets are per-day averages ((6+4)/2 and
    // (3+1)/2), and the last two are range totals (1 short day, 4
    // late-or-leave rows).
    for (const chip of [
      "Tracked (10)",
      "Checked In (5 avg)",
      "Not Checked (2 avg)",
      "Short Day (1)",
      "Late / Leave (4)",
    ]) {
      expect(within(attendance).getByRole("button", { name: chip })).toBeInTheDocument();
    }
  });

  it("maps the fetched days and buckets onto the chart series, field for field", async () => {
    renderConsole();
    await screen.findByText(/Valid until/);

    const byAria = new Map(chartCalls.map((c) => [c.ariaLabel as string, c]));
    // Attendance: the late/leave series merges its two fields; checked in
    // rides its own.
    const attendance = byAria.get("Daily attendance distribution across the period") as {
      series: Array<{ key: string; values: number[] }>;
    };
    const lateLeave = attendance.series.find((s) => s.key === "lateLeave");
    expect(lateLeave?.values).toEqual([3, 1]);
    const checkedIn = attendance.series.find((s) => s.key === "checkedIn");
    expect(checkedIn?.values).toEqual([6, 4]);
    // Jobs: the cumulative buckets flow straight through.
    const jobs = byAria.get("Cumulative job flow across the period") as {
      series: Array<{ key: string; values: number[] }>;
    };
    const created = jobs.series.find((s) => s.key === "employeeCreated");
    expect(created?.values).toEqual([3, 6, 9, 11, 12]);
    const owner = jobs.series.find((s) => s.key === "ownerCreated");
    expect(owner?.values).toEqual([1, 2, 3, 4, 5]);
    // Workforce: the headcounts ride the buckets too.
    const workforce = byAria.get(
      "Workforce headcounts, invites and pending approvals across the period",
    ) as { series: Array<{ key: string; values: number[] }> };
    const total = workforce.series.find((s) => s.key === "totalLine");
    expect(total?.values).toEqual([7, 7, 8, 8, 8]);
  });

  it("builds the workforce and attendance CSVs with headers and rows", async () => {
    const downloads: string[] = [];
    const saved: Blob[] = [];
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    const originalClick = HTMLAnchorElement.prototype.click;
    URL.createObjectURL = ((blob: Blob) => {
      saved.push(blob);
      return "blob:stub";
    }) as typeof URL.createObjectURL;
    URL.revokeObjectURL = (() => {}) as typeof URL.revokeObjectURL;
    HTMLAnchorElement.prototype.click = function click(this: HTMLAnchorElement) {
      downloads.push(this.download);
    };
    try {
      renderConsole();
      await screen.findByText(/Valid until/);
      for (const button of screen.getAllByRole("button", { name: "Download CSV" })) {
        fireEvent.click(button);
      }
      // The filenames name the loader-resolved window (the live 7-day
      // preset), not the fixture's static range.
      const from = istShifted(-6);
      const to = istToday();
      expect(downloads).toEqual([
        `workforce-${from}-to-${to}.csv`,
        `attendance-trend-${from}-to-${to}.csv`,
      ]);
      // Blob 0 = the workforce CSV, blob 1 = the attendance CSV.
      const workforceText = await saved[0].text();
      expect(workforceText).toContain(
        '"From","To","Total employees","Active employees","Pending invites","Needs approval"',
      );
      expect(workforceText).toContain('"2026-11-14","2026-11-14","8","7","1","3"');
      const attendanceText = await saved[1].text();
      expect(attendanceText).toContain(
        '"Date","Tracked","Checked in","Not checked in","Short day","Late","On leave"',
      );
      expect(attendanceText).toContain('"2026-11-08","10","6","3","1","2","1"');
    } finally {
      URL.createObjectURL = originalCreate;
      URL.revokeObjectURL = originalRevoke;
      HTMLAnchorElement.prototype.click = originalClick;
    }
  });

  it("renders the jobs legend's headline chips and the turnaround efficiency", async () => {
    renderConsole();
    await screen.findByText(/Valid until/);

    const jobs = card("Jobs & Approvals");
    // The chips read the headline counts the window accumulated.
    for (const chip of [
      "Created by Empl. (12)",
      "Created by You (5)",
      "Approved by You (7)",
      "Auto-Approved (2)",
    ]) {
      expect(within(jobs).getByRole("button", { name: chip })).toBeInTheDocument();
    }
    expect(within(jobs).getByText("Overall Turnaround efficiency:")).toBeInTheDocument();
    expect(within(jobs).getByText("34.5%")).toBeTruthy();
    expect(within(jobs).getByRole("link", { name: "Approval Rules" })).toHaveAttribute(
      "href",
      "/admin/company/employees",
    );
  });

  it("offers the two CSV downloads once the slices are in", async () => {
    renderConsole();
    await screen.findByText(/Valid until/);

    expect(screen.getAllByRole("button", { name: "Download CSV" })).toHaveLength(2);
  });

  it("toggles a legend chip: the hidden series leaves the chart, a second click brings it back", async () => {
    renderConsole();
    await screen.findByText(/Valid until/);

    const jobs = card("Jobs & Approvals");
    const chip = within(jobs).getByRole("button", { name: /Auto-Approved/ });
    // Shown reads pressed; the first click hides the series.
    expect(chip).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(chip);
    expect(chip).toHaveAttribute("aria-pressed", "false");
    // The stubbed chart's latest render drops the hidden series' key.
    const hidden = chartCalls.at(-1) as { series: Array<{ key: string }> };
    expect(hidden.series.some((s) => s.key === "employeeAutoApproved")).toBe(false);
    expect(hidden.series.some((s) => s.key === "employeeCreated")).toBe(true);
    fireEvent.click(chip);
    expect(chip).toHaveAttribute("aria-pressed", "true");
    const shown = chartCalls.at(-1) as { series: Array<{ key: string }> };
    expect(shown.series.some((s) => s.key === "employeeAutoApproved")).toBe(true);
  });
});

describe("AdminCompanyPage: the period presets", () => {
  it("highlights the address's preset in all three cards — the default is 7D", async () => {
    renderConsole();
    await screen.findByText(/Valid until/);

    for (const link of screen.getAllByRole("link", { name: "7D" })) {
      expect(link).toHaveAttribute("aria-current", "page");
    }
    for (const name of ["30 Days", "This Month"]) {
      for (const link of screen.getAllByRole("link", { name })) {
        expect(link).not.toHaveAttribute("aria-current");
      }
    }
  });

  it("highlights no preset link for a hand-set custom range", async () => {
    renderConsole("/admin/company?range=custom&from=2026-01-01&to=2026-01-31");
    await screen.findByText(/Valid until/);

    for (const name of ["7D", "30 Days", "This Month"]) {
      for (const link of screen.getAllByRole("link", { name })) {
        expect(link).not.toHaveAttribute("aria-current");
      }
    }
  });

  it("clicks a preset pill: the address changes, both chart reads refetch, and the layout's check does not re-run", async () => {
    const router = renderConsole("/admin/company");
    await screen.findByText(/Valid until/);
    const meBefore = meCalls; // the burst's single shared identity read

    fireEvent.click(screen.getAllByRole("link", { name: "30 Days" })[0] as HTMLElement);

    await waitFor(() => {
      expect(`${router.state.location.pathname}${router.state.location.search}`).toBe(
        "/admin/company?range=30",
      );
    });
    await waitFor(() => {
      const calls = sentRequests().filter((r) => r.url.includes("/job-reports/owner"));
      expect(calls.length).toBe(2);
    });
    // The report refetched for the 30-day window.
    const query = new URL(
      sentRequests().filter((r) => r.url.includes("/job-reports/owner"))[1]?.url ?? "",
    ).searchParams;
    expect(query.get("from")).toBe(istShifted(-29));
    expect(query.get("to")).toBe(istToday());
    // The layout's shouldRevalidate declines the non-/admin address, and the
    // overview loader's re-run rides the shared identity cache (CAP-8): the
    // /users/me count does not move.
    expect(meCalls).toBe(meBefore);
  });
});

describe("AdminCompanyPage: the slices' failure paths", () => {
  it("degrades a dead report to both report cards' retry cards; the attendance card stands", async () => {
    reportFails = true;
    renderConsole("/admin/company?range=custom&from=2026-01-01&to=2026-01-31");

    const alerts = await screen.findAllByText("The report could not load for this period.");
    expect(alerts).toHaveLength(2);
    // The same-address retry keeps a custom range's from/to.
    for (const link of screen.getAllByRole("link", { name: "Try again" })) {
      expect(link).toHaveAttribute(
        "href",
        "/admin/company?range=custom&from=2026-01-01&to=2026-01-31",
      );
    }
    // The attendance trend is a separate slice — it still renders.
    expect(screen.getByRole("heading", { name: "Attendance Trend" })).toBeInTheDocument();
  });

  it("degrades a dead attendance read to its own retry card; the report cards stand", async () => {
    trendFails = true;
    renderConsole();

    expect(
      await screen.findByText("The attendance trend could not load for this period."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Employee Overview & Analytics" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Jobs & Approvals" })).toBeInTheDocument();
  });

  it("degrades a malformed report body to the retry cards, the banner still up", async () => {
    reportBody = () => jsonResponse({});
    renderConsole();

    const alerts = await screen.findAllByText("The report could not load for this period.");
    expect(alerts).toHaveLength(2);
    expect(screen.getByLabelText("Subscription")).toBeInTheDocument();
  });

  it("degrades a malformed trend body to its own retry card, like the report guard", async () => {
    // A 200 with garbage must hit the validator, not crash the page's
    // days.reduce (BMAD review 2026-11-28).
    trendBody = () => jsonResponse({});
    renderConsole();
    expect(
      await screen.findByText("The attendance trend could not load for this period."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Employee Overview & Analytics" }),
    ).toBeInTheDocument();
  });

  it("waits through a slow report without dropping the rest of the page", async () => {
    reportBody = () =>
      new Promise((resolve) => setTimeout(() => resolve(jsonResponse(fullReport)), 30));
    renderConsole();
    await waitFor(() => expect(screen.getByText(/Valid until/)).toBeInTheDocument());
    expect(screen.queryByText("The report could not load for this period.")).toBeNull();
  });
});

describe("AdminCompanyPage: the chart requests on the wire (2026-11-28 slimming)", () => {
  it("asks the light report for charts explicitly: charts=true rides the default 7-day window", async () => {
    renderConsole();
    await screen.findByText(/Valid until/);

    const call = sentRequests().find((r) => r.url.includes("/job-reports/owner"));
    const query = new URL(call?.url ?? "").searchParams;
    expect(query.get("from")).toBe(istShifted(-6));
    expect(query.get("to")).toBe(istToday());
    expect(query.get("charts")).toBe("true");
    expect(call?.headers.get("Authorization")).toBe("Bearer tok-1");
  });

  it("passes a custom range's from and to straight through", async () => {
    renderConsole("/admin/company?range=custom&from=2026-01-01&to=2026-01-31");
    await screen.findByText(/Valid until/);

    const query = new URL(
      sentRequests().find((r) => r.url.includes("/job-reports/owner"))?.url ?? "",
    ).searchParams;
    expect(query.get("from")).toBe("2026-01-01");
    expect(query.get("to")).toBe("2026-01-31");
    expect(query.get("charts")).toBe("true");
  });

  it("falls back to the 7-day window for a hand-truncated custom range", async () => {
    renderConsole("/admin/company?range=custom");
    await screen.findByText(/Valid until/);

    const query = new URL(
      sentRequests().find((r) => r.url.includes("/job-reports/owner"))?.url ?? "",
    ).searchParams;
    expect(query.get("from")).toBe(istShifted(-6));
    expect(query.get("to")).toBe(istToday());
  });

  it("fetches the attendance trend for the same window, and nothing the page dropped", async () => {
    renderConsole();
    await screen.findByText(/Valid until/);

    const trendCall = sentRequests().find((r) => r.url.includes("/attendance/trend"));
    const query = new URL(trendCall?.url ?? "").searchParams;
    expect(query.get("from")).toBe(istShifted(-6));
    expect(query.get("to")).toBe(istToday());
    // The revamp's dropped reads stay dropped: no pulse and no members read
    // on the overview. (/attendance/leave still rides the burst — the
    // shell's sidebar Leave badge fetches it, not this page.)
    expect(sentRequests().some((r) => r.url.includes("/attendance/dashboard"))).toBe(false);
    expect(sentRequests().some((r) => r.url.includes("/members"))).toBe(false);
  });

  it("rides an old /admin dashboard deep link over with its range intact", async () => {
    // Pre-merge bookmarks and shared links point at /admin?range=… — the
    // owner redirect must keep the query, not land on the default period.
    const router = renderConsole("/admin?range=custom&from=2026-01-01&to=2026-01-31");
    await screen.findByText(/Valid until/);
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
});

describe("AdminCompanyPage: subscription", () => {
  it("prints the plan chip, the validity line and the billing note from the profile", async () => {
    renderConsole();
    await screen.findByText(/Valid until/);

    const banner = screen.getByLabelText("Subscription");
    expect(within(banner).getByText("Active")).toBeInTheDocument();
    expect(within(banner).getByText("Enterprise Plan")).toBeInTheDocument();
    expect(within(banner).getByText(/Valid until/)).toBeInTheDocument();
    expect(within(banner).getByText("(India time)")).toBeInTheDocument();
    expect(within(banner).getByText(/Annual Billing/)).toBeInTheDocument();
    expect(within(banner).getByText(/Auto-renews/)).toBeInTheDocument();
    expect(within(banner).getByRole("link", { name: /Manage Plan/ })).toHaveAttribute(
      "href",
      "/pricing",
    );
  });

  it("marks a past validity date Expired, not Active", async () => {
    // The chip's class flips with the copy; a stale date must never read
    // Active (BMAD review 2026-11-28: the branch had no test).
    meHasSubscription = true;
    const original = respondDefault;
    setRespond((url) =>
      url.endsWith("/users/me")
        ? jsonResponse({
            id: "u-owner",
            role: "company_admin",
            name: "Ravi Kumar",
            platformAdmin: false,
            email: null,
            countryCode: "+91",
            phoneNumber: "9900000001",
            employeeCode: null,
            status: "active",
            subscription: { validUntil: "2026-01-01T00:00:00Z" },
          })
        : original(url),
    );
    renderConsole();
    expect(await screen.findByText("Expired")).toBeInTheDocument();
  });

  it("says the subscription has no end date when the profile carries none", async () => {
    meHasSubscription = false;
    renderConsole();
    expect(await screen.findByText("No end date is set for this company.")).toBeInTheDocument();
    // With no end date there is no billing line either — the banner only
    // promises what the profile carries.
    expect(screen.queryByText("Annual Billing")).toBeNull();
  });
});
