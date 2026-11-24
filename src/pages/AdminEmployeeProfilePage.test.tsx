import { describe, expect, it, beforeAll, afterAll, afterEach, beforeEach } from "bun:test";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
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

/**
 * The employee profile page's contract: the address's tab picks the section
 * and only that section's data is fetched; a stale id lands on the honest
 * not-found state (never a failed page); deactivate posts to the route's own
 * action and the reloaded page shows the new status; the owner's own profile
 * never offers Deactivate.
 */

const OWNER = {
  id: "u-owner",
  role: "company_admin",
  name: "Ravi Kumar",
  platformAdmin: false,
  email: null,
  countryCode: "+91",
  phoneNumber: "9900000001",
  employeeCode: null,
  status: "active",
};

/** The member the profile reads — tests flip `status` for the activate flow. */
const state: {
  member: Record<string, unknown>;
  employment: Record<string, unknown>;
  punches: Array<Record<string, unknown>>;
} = {
  member: {},
  employment: {},
  punches: [],
};

function memberProfile(): Record<string, unknown> {
  return {
    userId: state.member.userId,
    name: "Asha V",
    email: "asha@example.com",
    countryCode: "+91",
    phoneNumber: "9800000002",
    employeeCode: "EMP-002",
    role: "employee",
    status: state.member.status,
    createdAt: "2026-01-01T00:00:00Z",
    avatarUrl: null,
    canCreateJobs: true,
    jobApprovalRequired: true,
    skills: [
      { id: "s-1", name: "Pipe Leak Repair" },
      { id: "s-2", name: "Drain Cleaning & Unclog" },
    ],
  };
}

function employmentRow() {
  return {
    userId: state.member.userId,
    employeeCode: "EMP-002",
    joinDate: "2026-01-15",
    exitDate: null,
    pan: null,
    dateOfBirth: null,
    fatherName: null,
    motherName: null,
    spouseName: null,
    pfAccountNumber: null,
    uanNumber: null,
    designation: "Senior plumber",
    department: null,
    bankAccountNumber: null,
    ifscCode: null,
    bankName: null,
  };
}

function jobsPage() {
  const job = (n: number, status: string) => ({
    id: `j-${n}`,
    jobNumber: `JB-2026-000${n}`,
    status,
    priority: "normal",
    scheduledStart: "2026-11-14T09:30:00Z",
    currentStep: null,
    skill: { id: "s-1", name: "Pipe Leak Repair" },
    technician: { id: state.member.userId, name: "Asha V" },
    customer: { id: "c-1", name: "Ravi Traders" },
    description: null,
    serviceLocation: "Cp, 110001, New Delhi",
    completedAt: null,
    createdAt: "2026-11-01T00:00:00Z",
    decidedAt: null,
    rejectionReason: null,
    currentStepIndex: null,
    workflowTemplate: null,
  });
  return {
    data: [job(9, "in_progress"), job(8, "completed"), job(10, "scheduled")],
    total: 3,
    page: 1,
    pageSize: 50,
    pages: 1,
    stats: {
      total: 3,
      scheduled: 1,
      inProgress: 1,
      pendingApproval: 0,
      completed: 1,
      cancelled: 0,
      rejected: 0,
      completed30d: 1,
    },
  };
}

function route(url: string): Response {
  const parsed = new URL(url, "http://localhost");
  const path = parsed.pathname;
  if (path.endsWith("/users/me")) return jsonResponse(OWNER);
  if (path.endsWith(`/members/${state.member.userId}`)) return jsonResponse(memberProfile());
  if (path.endsWith(`/members/${state.member.userId}/employment`))
    return jsonResponse(employmentRow());
  if (path.endsWith(`/members/${state.member.userId}/active`)) {
    const patch = sentRequests().find((r) => r.url.endsWith("/members/u-a/active"));
    const patchBody = patch?.body as Record<string, unknown> | undefined;
    state.member.status = patchBody?.["active"] === true ? "active" : "deactivated";
    return jsonResponse({ userId: state.member.userId, status: state.member.status });
  }
  if (path.endsWith("/jobs/page")) return jsonResponse(jobsPage());
  if (path.endsWith("/attendance/enrolments"))
    return jsonResponse([
      {
        employeeId: "u-a",
        memberStatus: state.member.status,
        attendanceEnabled: true,
        attendanceAccess: "active",
        attendanceStartDate: "2026-01-16",
        officeId: "o-1",
        officeName: "Jha home",
      },
    ]);
  if (path.endsWith("/attendance/offices/o-1"))
    return jsonResponse({
      id: "o-1",
      name: "Jha home",
      radiusM: 200,
      formattedAddress: "H1/104B, Block H, Vikaspuri, Delhi, 110018, India",
      rules: [
        {
          startTime: "09:30",
          endTime: "18:30",
          lateCutoffMinutes: 15,
          fullDayHours: 8,
          halfDayHours: 4,
          validFrom: "2026-01-01",
          validTo: null,
        },
      ],
    });
  if (path.endsWith("/attendance/punches"))
    return jsonResponse({
      employeeId: "u-a",
      from: parsed.searchParams.get("from"),
      to: parsed.searchParams.get("to"),
      today: "2026-11-21",
      punches: state.punches,
    });
  if (path.endsWith("/attendance/leave/u-a/balances"))
    return jsonResponse([
      {
        typeId: "lt-1",
        code: "earned",
        name: "Earned Leave",
        accrualMode: "monthly",
        accrualDays: 1,
        enabled: true,
        remaining: 2,
      },
    ]);
  if (path.endsWith("/attendance/leave/summary"))
    return jsonResponse({
      activeEmployees: 10,
      counts: { pending: 1, approved: 0, revoked: 0, cancelled: 0, rejected: 0 },
    });
  if (path.endsWith("/attendance/leave") && parsed.searchParams.get("employeeId") !== null)
    return jsonResponse({ data: [], nextCursor: null, hasMore: false });
  if (path.endsWith("/payroll/payslips")) return jsonResponse([]);
  if (path.endsWith(`/members/${state.member.userId}/salary-structures`))
    // The empty-structures state is built from the BE's 404 (no structure
    // yet) — the fake must answer it, never a lying 200.
    return jsonResponse({ error_code: "RESOURCE_NOT_FOUND", message: "gone" }, 404);
  // Anything unmocked is a 404 envelope, not a success-shaped `{}` that
  // could quietly stand in for real data.
  return jsonResponse({ error_code: "RESOURCE_NOT_FOUND", message: "not mocked" }, 404);
}

function renderAt(path: string): ReturnType<typeof createMemoryRouter> {
  writeSession({ token: "tok-1", name: "Ravi" });
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

beforeAll(() => useApiBase());
afterAll(() => clearApiBase());
beforeEach(() => {
  installFetchMock();
  state.member = { userId: "u-a", status: "active" };
  state.punches = [];
  setRespond(route);
});
afterEach(() => {
  restoreFetchMock();
  window.localStorage.clear();
  cleanup();
});

describe("Employee profile: the tabs fetch only their own section", () => {
  it("opens on Master Record and asks only for the member and their employment", async () => {
    renderAt("/admin/company/employees/u-a");
    await screen.findByText("Date of Birth");
    expect(screen.getByText("Pipe Leak Repair")).toBeTruthy();
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === "P" &&
          (element?.textContent ?? "").startsWith(
            "Statutory profile incomplete for automated EPF filing",
          ),
      ),
    ).toBeTruthy();
    const reads = sentRequests();
    expect(reads.some((r) => r.url.endsWith("/members/u-a/employment"))).toBe(true);
    // No other tab's endpoint fires for the bare address.
    expect(reads.some((r) => r.url.includes("/jobs/page"))).toBe(false);
    expect(reads.some((r) => r.url.includes("/attendance/punches"))).toBe(false);
    // The layout's owner badge reads the leave summary on every mount —
    // that's the sidebar's read, not this page's. Every other leave read
    // (the list, balances, actions) must stay quiet on the bare address.
    expect(
      reads.some(
        (r) => r.url.includes("/attendance/leave") && !r.url.includes("/attendance/leave/summary"),
      ),
    ).toBe(false);
    expect(reads.some((r) => r.url.includes("/payroll/payslips"))).toBe(false);
  });

  it("renders the statutory grid as honest Add affordances for empty fields", async () => {
    renderAt("/admin/company/employees/u-a");
    await screen.findByText("Date of Birth");
    expect(screen.getByText("Date of Birth")).toBeTruthy();
    const addButtons = screen.getAllByText("+ Add");
    expect(addButtons.length).toBeGreaterThanOrEqual(9);
  });

  it("the Jobs tab fetches the person's own jobs with the technician scope", async () => {
    renderAt("/admin/company/employees/u-a?tab=jobs");
    await screen.findByText("JB-2026-0009");
    const chipRow = screen.getByText("Total jobs", { exact: false }).closest("div");
    expect(chipRow?.textContent).toContain("3 Total jobs");
    expect(chipRow?.textContent).toContain("1 In progress");
    expect(chipRow?.textContent).toContain("1 Scheduled");
    expect(chipRow?.textContent).toContain("1 Completed");
    const jobsReads = sentRequests().filter((r) => r.url.includes("/jobs/page"));
    expect(jobsReads.length).toBe(1);
    expect(jobsReads[0].url).toContain("technicianId=u-a");
    // The other tabs stay quiet.
    expect(sentRequests().some((r) => r.url.endsWith("/members/u-a/employment"))).toBe(false);
    expect(sentRequests().some((r) => r.url.includes("/attendance/punches"))).toBe(false);
  });

  it("an unknown tab value falls back to Master Record", async () => {
    renderAt("/admin/company/employees/u-a?tab=nonsense");
    await screen.findByText("Date of Birth");
    expect(screen.getByRole("heading", { level: 3, name: "Workforce master record" })).toBeTruthy();
  });
});

describe("Employee profile: a stale or foreign id", () => {
  it("lands on the honest not-on-the-team state, not a failed page", async () => {
    installFetchMock();
    state.member = { userId: "u-a", status: "active" };
    setRespond((url) => {
      if (new URL(url, "http://localhost").pathname.endsWith("/users/me"))
        return jsonResponse(OWNER);
      if (new URL(url, "http://localhost").pathname.endsWith("/members/u-a"))
        return jsonResponse({ error_code: "RESOURCE_NOT_FOUND", message: "gone" }, 404);
      return jsonResponse({});
    });
    renderAt("/admin/company/employees/u-a");
    await screen.findByText(/not on the team/i);
    expect(screen.getByRole("heading", { level: 1, name: "Employee" })).toBeTruthy();
    expect(screen.getByText("Back to all employees")).toBeTruthy();
  });

  it("lands a malformed id on the same state — the BE refuses it with 400, not 404", async () => {
    installFetchMock();
    setRespond((url) => {
      const path = new URL(url, "http://localhost").pathname;
      if (path.endsWith("/users/me")) return jsonResponse(OWNER);
      if (path.endsWith("/members/not-a-uuid"))
        return jsonResponse({ error_code: "VALIDATION_ERROR", message: "not a uuid" }, 400);
      return jsonResponse({});
    });
    renderAt("/admin/company/employees/not-a-uuid");
    await screen.findByText(/not on the team/i);
    expect(screen.getByRole("heading", { level: 1, name: "Employee" })).toBeTruthy();
  });
});

describe("Employee profile: moving between employees", () => {
  function otherProfile(userId: string, name: string): Record<string, unknown> {
    return {
      userId,
      name,
      email: null,
      countryCode: "+91",
      phoneNumber: "9800000002",
      employeeCode: "EMP-002",
      role: "employee",
      status: "active",
      createdAt: "2026-01-01T00:00:00Z",
      avatarUrl: null,
      canCreateJobs: true,
      jobApprovalRequired: true,
      skills: [],
    };
  }

  it("refetches when the address moves to another employee with the same tab", async () => {
    installFetchMock();
    state.member = { userId: "u-a", status: "active" };
    setRespond((url) => {
      const path = new URL(url, "http://localhost").pathname;
      if (path.endsWith("/users/me")) return jsonResponse(OWNER);
      if (path.endsWith("/members/u-a")) return jsonResponse(otherProfile("u-a", "Asha A"));
      if (path.endsWith("/members/u-b")) return jsonResponse(otherProfile("u-b", "Bunty B"));
      if (path.endsWith("/members/u-a/employment") || path.endsWith("/members/u-b/employment"))
        return jsonResponse(employmentRow());
      return jsonResponse({});
    });
    const router = renderAt("/admin/company/employees/u-a");
    await screen.findByText("Asha A");
    const bMemberReads = () => sentRequests().filter((r) => r.url.endsWith("/members/u-b")).length;
    expect(bMemberReads()).toBe(0);
    // The two addresses carry the same (empty) search — only the person in
    // the pathname changed, and that alone must move the data.
    await router.navigate("/admin/company/employees/u-b");
    await screen.findByText("Bunty B");
    expect(bMemberReads()).toBe(1);
    // The contract stays two-sided: the same address again is a manual retry
    // and still re-runs the loader.
    await router.navigate("/admin/company/employees/u-b");
    await screen.findByText("Bunty B");
    expect(bMemberReads()).toBe(2);
  });
});

describe("Employee profile: deactivate / reinstate", () => {
  it("asks for confirmation, posts to the route's action, and reloads to the new status", async () => {
    renderAt("/admin/company/employees/u-a");
    await screen.findByText("Date of Birth");
    await waitFor(() => expect(screen.getByRole("button", { name: "Deactivate" })).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Deactivate" }));
    await screen.findByRole("button", { name: "Confirm deactivate" });
    // The confirm step is cancellable.
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("button", { name: "Confirm deactivate" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Deactivate" }));
    await screen.findByRole("button", { name: "Confirm deactivate" });
    fireEvent.click(screen.getByRole("button", { name: "Confirm deactivate" }));

    await waitFor(() => {
      const patch = sentRequests().find(
        (r) => r.method === "PATCH" && r.url.endsWith("/members/u-a/active"),
      );
      expect(patch).toBeTruthy();
    });
    const patch = sentRequests().find(
      (r) => r.method === "PATCH" && r.url.endsWith("/members/u-a/active"),
    )!;
    // The wire body is the API contract ({ active }); the form's intent field
    // is consumed by the action, never forwarded.
    expect(patch.body).toMatchObject({ active: false });
    // The action revalidates the page: the member read re-runs and the
    // reloaded profile shows the parked status with a Reinstate action.
    await waitFor(() => screen.getByText("Deactivated"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Reinstate" })).toBeTruthy());
  });

  it("never offers Deactivate on the signed-in owner's own profile", async () => {
    state.member = { userId: "u-owner", status: "active" };
    renderAt("/admin/company/employees/u-owner");
    await screen.findByText("Asha V");
    expect(screen.queryByRole("button", { name: "Deactivate" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Reinstate" })).toBeNull();
  });
});

describe("Employee profile: the Attendance tab", () => {
  it("shows the assigned office, the shift rules and the honest punch empty state", async () => {
    renderAt("/admin/company/employees/u-a?tab=attendance");
    await screen.findByText("Jha home");
    expect(screen.getByText("H1/104B, Block H, Vikaspuri, Delhi, 110018, India")).toBeTruthy();
    expect(screen.getByText("200 m geofence radius")).toBeTruthy();
    expect(screen.getByText("Assigned since 16 Jan 2026")).toBeTruthy();
    expect(screen.getByText("Late cutoff")).toBeTruthy();
    expect(screen.getByText("15 min")).toBeTruthy();
    expect(screen.getByText("Punches appear here once Asha V checks in at Jha home.")).toBeTruthy();
  });

  it("lists real punch rows with their graded status when the month has punches", async () => {
    state.punches = [
      {
        workDate: "2026-10-25",
        checkinAt: "2026-10-25T00:32:00+05:30",
        checkinDistanceM: 4,
        checkoutAt: "2026-10-25T00:41:00+05:30",
        checkoutDistanceM: 58,
        officeId: "o-1",
        officeName: "Jha home",
        status: "absent",
        corrected: false,
      },
    ];
    renderAt("/admin/company/employees/u-a?tab=attendance&month=2026-10");
    await screen.findByText("25 Oct 2026");
    expect(screen.getByText("4 m")).toBeTruthy();
    expect(screen.getByText("Absent")).toBeTruthy();
  });

  it("says the person is not enrolled when the roster has no row for them", async () => {
    installFetchMock();
    state.member = { userId: "u-a", status: "active" };
    setRespond((url) => {
      const path = new URL(url, "http://localhost").pathname;
      if (path.endsWith("/users/me")) return jsonResponse(OWNER);
      if (path.endsWith("/members/u-a")) return jsonResponse(memberProfile());
      if (path.endsWith("/attendance/enrolments")) return jsonResponse([]);
      if (path.endsWith("/attendance/punches"))
        return jsonResponse({
          employeeId: "u-a",
          from: "2026-11-01",
          to: "2026-11-30",
          today: "2026-11-21",
          punches: [],
        });
      return jsonResponse({});
    });
    renderAt("/admin/company/employees/u-a?tab=attendance");
    await screen.findByText("Not enrolled in attendance yet.");
  });

  it("does not call a failed enrolment read 'not enrolled'", async () => {
    setRespond((url) =>
      url.endsWith("/attendance/enrolments") ? jsonResponse({}, 500) : route(url),
    );
    renderAt("/admin/company/employees/u-a?tab=attendance");
    await screen.findByText("The enrolment could not load — retry the page from the menu.");
    expect(screen.queryByText("No shift rules — the person is not enrolled.")).toBeNull();
    expect(screen.getByText("The shift rules could not load.")).toBeTruthy();
  });

  it("shows only the rule that covers today, never a retired or future-dated one", async () => {
    installFetchMock();
    state.member = { userId: "u-a", status: "active" };
    setRespond((url) => {
      const path = new URL(url, "http://localhost").pathname;
      if (path.endsWith("/users/me")) return jsonResponse(OWNER);
      if (path.endsWith("/members/u-a")) return jsonResponse(memberProfile());
      if (path.endsWith("/attendance/enrolments"))
        return jsonResponse([
          {
            employeeId: "u-a",
            memberStatus: "active",
            attendanceEnabled: true,
            attendanceAccess: "active",
            attendanceStartDate: "2026-01-16",
            officeId: "o-1",
            officeName: "Jha home",
          },
        ]);
      if (path.endsWith("/attendance/offices/o-1"))
        return jsonResponse({
          id: "o-1",
          name: "Jha home",
          radiusM: 200,
          formattedAddress: null,
          // Neither revision covers today: one retired in June, one starting
          // next year — neither may stand in for the present day's rules.
          rules: [
            {
              startTime: "06:00",
              endTime: "14:00",
              lateCutoffMinutes: 10,
              fullDayHours: 7,
              halfDayHours: 3,
              validFrom: "2025-01-01",
              validTo: "2026-06-30",
            },
            {
              startTime: "07:00",
              endTime: "15:00",
              lateCutoffMinutes: 10,
              fullDayHours: 7,
              halfDayHours: 3,
              validFrom: "2027-01-01",
              validTo: null,
            },
          ],
        });
      if (path.endsWith("/attendance/punches"))
        return jsonResponse({
          employeeId: "u-a",
          from: "2026-11-01",
          to: "2026-11-30",
          today: "2026-11-21",
          punches: [],
        });
      return jsonResponse({});
    });
    renderAt("/admin/company/employees/u-a?tab=attendance");
    await screen.findByText("Jha home");
    expect(screen.queryByText("06:00")).toBeNull();
    expect(screen.queryByText("07:00")).toBeNull();
    expect(screen.queryByText("14:00")).toBeNull();
    expect(screen.queryByText("15:00")).toBeNull();
  });

  it("aims the month nav at the months either side of the one on screen", async () => {
    renderAt("/admin/company/employees/u-a?tab=attendance&month=2026-10");
    await screen.findByText("Jha home");
    const nav = screen.getByRole("navigation", { name: "Month" });
    expect(within(nav).getByRole("link", { name: "‹ Previous" }).getAttribute("href")).toBe(
      "/admin/company/employees/u-a?tab=attendance&month=2026-09",
    );
    expect(within(nav).getByRole("link", { name: "Next ›" }).getAttribute("href")).toBe(
      "/admin/company/employees/u-a?tab=attendance&month=2026-11",
    );
  });
});

describe("Employee profile: the Leave and Payroll tabs", () => {
  it("renders balance cards from the balances endpoint with their accrual captions", async () => {
    renderAt("/admin/company/employees/u-a?tab=leave");
    await screen.findByText("Accrues 1 day / month");
    const card = screen.getByText("Earned Leave").closest("div");
    expect(card?.textContent).toContain("2 days left");
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === "P" &&
          (element?.textContent ?? "").startsWith("No leave requests yet"),
      ),
    ).toBeTruthy();
    // A whole list never claims there is more behind it.
    expect(screen.queryByText(/not listed in the console yet/)).toBeNull();
    // The requests list never fires without its own read.
    expect(sentRequests().some((r) => r.url.includes("/payroll/payslips"))).toBe(false);
  });

  it("says when the requests list is only the newest page", async () => {
    setRespond((url) => {
      const parsed = new URL(url, "http://localhost");
      if (
        parsed.pathname.endsWith("/attendance/leave") &&
        parsed.searchParams.get("employeeId") !== null
      )
        return jsonResponse({
          data: [
            {
              id: "lr-1",
              startDate: "2026-11-02",
              endDate: "2026-11-04",
              part: "",
              reason: "Family function",
              status: "approved",
              workingDays: 3,
              totalDays: 3,
            },
          ],
          nextCursor: "c2",
          hasMore: true,
        });
      return route(url);
    });
    renderAt("/admin/company/employees/u-a?tab=leave");
    await screen.findByText("Family function");
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === "P" &&
          (element?.textContent ?? "").startsWith(
            "Only the newest 1 show here — older requests are not listed in the console yet.",
          ),
      ),
    ).toBeTruthy();
  });

  it("reads the recent payslip months and keeps only this employee's rows", async () => {
    renderAt("/admin/company/employees/u-a?tab=payroll");
    await screen.findByText("No salary structure yet");
    expect(screen.getByText("Manage salary in Payroll")).toBeTruthy();
    const payslipReads = sentRequests().filter((r) => r.url.includes("/payroll/payslips"));
    expect(payslipReads.length).toBe(3);
    expect(screen.getByText(/No payslips yet/)).toBeTruthy();
  });
});

describe("Employee profile: the page heading", () => {
  it("shows exactly one level-one heading, the page's own", async () => {
    renderAt("/admin/company/employees/u-a");
    await screen.findByText("Date of Birth");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });
});

describe("Employee profile: the employment dialog", () => {
  it("opens from Edit Profile with a fresh employment read", async () => {
    renderAt("/admin/company/employees/u-a");
    await screen.findByText("Date of Birth");
    // The master tab's own employment read is already on the wire.
    const reads = () =>
      sentRequests().filter((r) => r.method === "GET" && r.url.includes("/members/u-a/employment"));
    const before = reads().length;
    fireEvent.click(screen.getByRole("button", { name: "Edit Profile" }));
    await screen.findByText("Employment details — EMP-002");
    expect(
      (screen.getByRole("dialog", { name: "Employment details for Asha V" }) as HTMLDialogElement)
        .open,
    ).toBe(true);
    // A fresh read rides every open, never the page load's stale answer.
    await waitFor(() => expect(reads().length).toBe(before + 1));
  });
});
