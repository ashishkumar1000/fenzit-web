import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";
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
import type { LeaveRow } from "../features/admin/companyApi";
import type { LeaveTypeRow } from "../features/admin/leaveApi";

// The owner's Leave section: the types tab's master-detail (cards on top,
// the selected type's editor below, remnants read-only), the requests tab's
// table + detail panel driven by `selected=` in the address, and the
// calendar tab's month grid fed by 27-1's from/to window. Every endpoint
// answers by URL, statelessly; writes are asserted on the wire.

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

afterEach(() => {
  restoreFetchMock();
  window.localStorage.clear();
  window.sessionStorage.clear();
  cleanup();
});

function leaveType(
  overrides: Partial<LeaveTypeRow> & Pick<LeaveTypeRow, "id" | "name" | "code">,
): LeaveTypeRow {
  return {
    accrualMode: "monthly",
    accrualDays: 1,
    carryForward: false,
    allowOverBalance: false,
    paid: true,
    enabled: true,
    configurable: true,
    ...overrides,
  };
}

function leaveTypeRows(): LeaveTypeRow[] {
  return [
    leaveType({ id: "t-earned", name: "Earned Leave", code: "earned", carryForward: true }),
    // Sick sits off in this fixture — the card row's "Turned Off" footer and
    // the asleep header chip need a type the suite never switches on.
    leaveType({ id: "t-sick", name: "Sick Leave", code: "sick", accrualDays: 0, enabled: false }),
    leaveType({
      id: "t-bereave",
      name: "Bereavement Leave",
      code: "bereavement",
      accrualMode: "annual",
      accrualDays: 3,
    }),
    leaveType({
      id: "t-comp",
      name: "Comp Off",
      code: "comp_off",
      accrualMode: "none",
      accrualDays: 0,
    }),
    leaveType({
      id: "t-old",
      name: "Old Casual Leave",
      code: null,
      accrualMode: null,
      configurable: false,
      enabled: false,
    }),
  ];
}

function leaveRow(
  overrides: Partial<LeaveRow> & Pick<LeaveRow, "id" | "employeeId" | "status">,
): LeaveRow {
  return {
    employeeName: "Asha V",
    employeeCode: "EMP-001",
    startDate: "2026-11-17",
    endDate: "2026-11-20",
    part: "full_day",
    reason: "Family function",
    createdAt: "2026-11-10T04:30:00.000Z",
    workingDays: 4,
    totalDays: 4,
    employeeAvatarUrl: null,
    dates: [
      { date: "2026-11-17", state: overrides.status === "pending" ? "pending" : "approved" },
      { date: "2026-11-18", state: overrides.status === "pending" ? "pending" : "approved" },
      { date: "2026-11-19", state: overrides.status === "pending" ? "pending" : "approved" },
      { date: "2026-11-20", state: overrides.status === "pending" ? "pending" : "approved" },
    ],
    ...overrides,
  };
}

function listRows(): LeaveRow[] {
  return [
    leaveRow({ id: "r-1", employeeId: "u-emp-1", status: "pending" }),
    leaveRow({
      id: "r-2",
      employeeId: "u-emp-2",
      employeeName: "Bunty R",
      employeeCode: "EMP-002",
      status: "approved",
      startDate: "2026-11-18",
      endDate: "2026-11-18",
      workingDays: 1,
      totalDays: 1,
      reason: "",
      dates: [{ date: "2026-11-18", state: "approved" }],
    }),
  ];
}

/** The calendar tab's reads carry `status=approved`, so the server answers
 *  approved rows only — the same two requests, r-1 now approved. */
function approvedRows(): LeaveRow[] {
  return [
    leaveRow({ id: "r-1", employeeId: "u-emp-1", status: "approved" }),
    ...listRows().slice(1),
  ];
}

function balances(): unknown[] {
  return [
    {
      typeId: "t-earned",
      code: "earned",
      name: "Earned Leave",
      accrualMode: "monthly",
      accrualDays: 1,
      enabled: true,
      credits: 0,
      accrued: 8,
      carryForward: 0,
      consumed: 2,
      remaining: 6,
    },
    {
      typeId: "t-sick",
      code: "sick",
      name: "Sick Leave",
      accrualMode: "monthly",
      accrualDays: 0,
      enabled: true,
      credits: 0,
      accrued: 0,
      carryForward: 0,
      consumed: 0,
      remaining: 0,
    },
  ];
}

function respondDefault(url: string): Response {
  const { pathname } = new URL(url);
  if (pathname.endsWith("/users/me")) {
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
  if (pathname.endsWith("/attendance/leave/types")) return jsonResponse(leaveTypeRows());
  if (pathname.endsWith("/attendance/leave") && pathname !== "/api/v1/attendance/leave") {
    // Not hit by these tests — the list path is matched exactly below.
    return jsonResponse({ data: [], nextCursor: null, hasMore: false });
  }
  if (pathname.endsWith("/attendance/leave")) {
    const { search } = new URL(url);
    if (search.includes("from="))
      return jsonResponse({ data: approvedRows(), nextCursor: null, hasMore: false });
    return jsonResponse({ data: listRows(), nextCursor: null, hasMore: false });
  }
  if (/\/attendance\/leave\/[^/]+\/balances$/.test(pathname)) return jsonResponse(balances());
  if (pathname.endsWith("/attendance/holidays")) {
    return jsonResponse([
      { id: "h-1", date: "2026-12-25", name: "Christmas" },
      { id: "h-2", date: "2026-11-10", name: "Diwali (past)" },
    ]);
  }
  if (/\/approve$|\/reject$|\/revoke$/.test(pathname)) {
    return jsonResponse(leaveRow({ id: "r-1", employeeId: "u-emp-1", status: "approved" }));
  }
  throw new TypeError(`offline in tests: ${url}`);
}

function renderLeave(entry = "/admin/company/leave"): ReturnType<typeof createMemoryRouter> {
  writeSession({ token: "tok-1", name: "Ravi" });
  const router = createMemoryRouter(routes, { initialEntries: [entry] });
  render(<RouterProvider router={router} />);
  return router;
}

describe("AdminLeavePage: the types tab", () => {
  it("renders the card row, the selected editor and the remnant line", async () => {
    renderLeave();
    // The cards are toggle buttons — `pressed` separates them from the
    // editors' "Save …" buttons, which share the type's name. Unselected
    // editors sit in hidden wrappers, out of the accessibility tree.
    expect(
      await screen.findByRole("button", { name: /Earned Leave/, pressed: true }),
    ).toBeInTheDocument();
    for (const name of ["Sick Leave", "Bereavement Leave", "Comp Off"]) {
      expect(
        screen.getByRole("button", { name: new RegExp(name), pressed: false }),
      ).toBeInTheDocument();
    }
    // Each card carries its state in copy: the pressed one is "Editing Now"
    // over "Active Policy", the rest "Click to Edit" over "Switch to …",
    // with the type's annualized rate on the card itself.
    const earnedCard = screen.getByRole("button", { name: /Earned Leave/, pressed: true });
    expect(earnedCard).toHaveTextContent("Editing Now");
    expect(earnedCard).toHaveTextContent("Active Policy");
    expect(earnedCard).toHaveTextContent("12 days / year");
    const sickCard = screen.getByRole("button", { name: /Sick Leave/, pressed: false });
    expect(sickCard).toHaveTextContent("Click to Edit");
    expect(sickCard).toHaveTextContent("Switch to Sick Leave");
    expect(screen.getByText("Earned Leave rules")).toBeInTheDocument();
    // The editor header carries the live chip and the schema pill.
    const earnedEditor = screen.getByText("Earned Leave rules").closest("section")!;
    expect(within(earnedEditor).getByText("Active Type")).toBeInTheDocument();
    expect(within(earnedEditor).getByText(/Schema ID/)).toBeInTheDocument();
    expect(
      screen.getByText("No rate — days come from approved comp-off earns, not a rate."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Kept for history, not editable: Old Casual Leave/),
    ).toBeInTheDocument();
    // Every editor stays mounted (hidden when not selected) — the comp-off
    // editor carries toggles but no rate input at all.
    expect(screen.queryByLabelText("Grant per year")).not.toBeNull();
    const compOffEditor = screen.getByText("Comp Off rules").closest("section")!;
    expect(within(compOffEditor).queryByLabelText("Grant per year")).toBeNull();
    expect(within(compOffEditor).queryByLabelText("Days given each month")).toBeNull();
    // A card click selects that type's editor.
    expect(screen.getByText("Sick Leave rules").closest("[hidden]")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Sick Leave/, pressed: false }));
    expect(screen.getByRole("button", { name: /Sick Leave/, pressed: true })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Earned Leave/, pressed: false }),
    ).toBeInTheDocument();
    expect(screen.getByText("Sick Leave rules").closest("[hidden]")).toBeNull();
    // The selected card's footer follows the server truth — sick sits off in
    // the fixture, so its footer reads "Turned Off".
    expect(screen.getByRole("button", { name: /Sick Leave/, pressed: true })).toHaveTextContent(
      "Turned Off",
    );
  });

  it("the PATCH carries changed fields only", async () => {
    renderLeave();
    const days = (await screen.findAllByLabelText("Days given each month"))[0];
    fireEvent.change(days, { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Earned Leave" }));
    await waitFor(() => {
      const patch = sentRequests().find((request) => request.method === "PATCH");
      expect(patch).toBeDefined();
      expect(patch?.url.endsWith("/attendance/leave/types/t-earned")).toBe(true);
      expect(patch?.body).toEqual({ accrualDays: 2 });
    });
  });

  it("the stepper nudges the rate and the chip annualizes it", async () => {
    renderLeave();
    // The ×12 chip previews the annual figure for the monthly rate.
    expect(await screen.findByText("1 day/mo = 12 days/yr")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Increase days" }));
    expect(screen.getByText("1.5 day/mo = 18 days/yr")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save Earned Leave" }));
    await waitFor(() => {
      const patch = sentRequests().find((request) => request.method === "PATCH");
      expect(patch?.url.endsWith("/attendance/leave/types/t-earned")).toBe(true);
      expect(patch?.body).toEqual({ accrualDays: 1.5 });
    });
  });

  it("the header switch turns a type off — the form sleeps and the save posts enabled only", async () => {
    renderLeave();
    const onOff = await screen.findByRole("switch", { name: "Turn Earned Leave on or off" });
    fireEvent.click(onOff);
    // The header chip flips with the local state — the editor is asleep.
    const earnedEditor = screen.getByText("Earned Leave rules").closest("section")!;
    expect(within(earnedEditor).getByText("inactive")).toBeInTheDocument();
    // Off means the rules sleep: rate input, stepper and quick-sets, and the
    // other switches all go inert — only the header switch and the save
    // (which now carries just the enabled change) still work.
    expect(screen.getAllByLabelText("Days given each month")[0]).toBeDisabled();
    expect(screen.getByRole("button", { name: "Decrease days" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Increase days" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "1 day" })).toBeDisabled();
    expect(screen.getByRole("switch", { name: "Paid time off" })).toBeDisabled();
    expect(screen.getByRole("switch", { name: "Move unused days to next year" })).toBeDisabled();
    expect(screen.getByRole("switch", { name: "Allow taking extra days" })).toBeDisabled();
    expect(screen.getByRole("switch", { name: "Turn Earned Leave on or off" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Save Earned Leave" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Save Earned Leave" }));
    await waitFor(() => {
      const patch = sentRequests().find((request) => request.method === "PATCH");
      expect(patch?.url.endsWith("/attendance/leave/types/t-earned")).toBe(true);
      expect(patch?.body).toEqual({ enabled: false });
    });
  });
});

describe("AdminLeavePage: the requests tab", () => {
  it("sends the status filter and the page size, and a chip change is an address", async () => {
    renderLeave("/admin/company/leave?tab=requests&status=pending");
    await screen.findByText("Asha V");
    expect(
      sentRequests().some((r) => r.url.includes("status=pending") && r.url.includes("limit=20")),
    ).toBe(true);
    fireEvent.click(screen.getByRole("link", { name: "Approved" }));
    await waitFor(() => {
      expect(sentRequests().some((r) => r.url.includes("status=approved"))).toBe(true);
    });
    // A status change drops the open panel's param from the address.
    expect(
      sentRequests().every(
        (r) => !r.url.includes("status=approved") || !r.url.includes("selected="),
      ),
    ).toBe(true);
  });

  it("approve posts with no body, reject posts the reason", async () => {
    renderLeave("/admin/company/leave?tab=requests");
    await screen.findByText("Asha V");
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    fireEvent.click(await screen.findByRole("button", { name: "Approve leave" }));
    await waitFor(() => {
      const post = sentRequests().find((r) => r.url.endsWith("/approve"));
      expect(post).toBeDefined();
      expect(post?.body).toBeUndefined();
    });
    fireEvent.click(await screen.findByRole("button", { name: "Close" }));

    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    fireEvent.change(await screen.findByLabelText("Reason (optional)"), {
      target: { value: "Team is short that week" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reject request" }));
    await waitFor(() => {
      const post = sentRequests().find((r) => r.url.endsWith("/reject"));
      expect(post?.body).toEqual({ reason: "Team is short that week" });
    });
  });

  it("revoke stays locked until its reason exists, then posts it", async () => {
    renderLeave("/admin/company/leave?tab=requests");
    await screen.findByText("Bunty R"); // the fixture's approved row
    fireEvent.click(screen.getByRole("button", { name: "Revoke" }));
    const reason = await screen.findByLabelText("Reason (required)");
    const confirm = screen.getByRole("button", { name: "Revoke leave" });
    // FR-14: no reason, no revoke — the confirm sleeps until there is one.
    expect(confirm).toBeDisabled();
    fireEvent.change(reason, { target: { value: "Covering the shift myself" } });
    fireEvent.click(screen.getByRole("button", { name: "Revoke leave" }));
    await waitFor(() => {
      const post = sentRequests().find((r) => r.url.endsWith("/revoke"));
      expect(post).toBeDefined();
      expect(post?.body).toEqual({ reason: "Covering the shift myself" });
    });
  });

  it("selected= drives the balances read and the panel renders the facts", async () => {
    renderLeave("/admin/company/leave?tab=requests&selected=r-1");
    const panel = await screen.findByRole("complementary", { name: "Request details" });
    expect(sentRequests().some((r) => r.url.includes("/u-emp-1/balances"))).toBe(true);
    // The reason also lives in the table's cell — the panel's copy is the
    // one asserted here.
    expect(within(panel).getByText("Family function")).toBeInTheDocument();
    expect(within(panel).getByText("6 of 8 days left")).toBeInTheDocument();
    expect(within(panel).getByText("No balance recorded for this type.")).toBeInTheDocument();
    // The selected row's name link carries the aria-current marker.
    expect(screen.getByRole("link", { name: "Asha V" }).getAttribute("aria-current")).toBe("true");
  });

  it("a stale selected id renders no panel", async () => {
    renderLeave("/admin/company/leave?tab=requests&selected=r-ghost");
    await screen.findByText("Asha V");
    expect(screen.queryByText("Request details")).toBeNull();
    expect(sentRequests().every((r) => !r.url.includes("/balances"))).toBe(true);
  });

  it("a failed balances read degrades to a note — the request stays shown", async () => {
    setRespond((url) => {
      const { pathname } = new URL(url);
      if (/\/attendance\/leave\/[^/]+\/balances$/.test(pathname)) {
        return jsonResponse({ message: "boom" }, 500);
      }
      return respondDefault(url);
    });
    renderLeave("/admin/company/leave?tab=requests&selected=r-1");
    const panel = await screen.findByRole("complementary", { name: "Request details" });
    expect(within(panel).getByText(/The balance could not be loaded/)).toBeInTheDocument();
    expect(within(panel).getByText("Family function")).toBeInTheDocument();
  });

  it("the pager is an address that drops the panel — Older carries the cursor, not the selection", async () => {
    setRespond((url) => {
      const { pathname, search } = new URL(url);
      if (pathname.endsWith("/users/me")) return respondDefault(url);
      if (pathname.endsWith("/attendance/leave")) {
        const next = search.includes("cursor=") ? null : "c-9";
        return jsonResponse({ data: listRows(), nextCursor: next, hasMore: next !== null });
      }
      return respondDefault(url);
    });
    renderLeave("/admin/company/leave?tab=requests");
    await screen.findByText("Asha V");
    // Open the panel, then walk to the older page — the address carries the
    // cursor and drops `selected` (a selection belongs to one walk), so the
    // panel cannot re-open when Start over returns to this page.
    fireEvent.click(screen.getByRole("link", { name: "Asha V" }));
    fireEvent.click(await screen.findByRole("link", { name: "Older ›" }));
    await waitFor(() => {
      expect(sentRequests().some((r) => r.url.includes("cursor=c-9"))).toBe(true);
    });
    expect(
      sentRequests().every((r) => !r.url.includes("cursor=c-9") || !r.url.includes("selected=")),
    ).toBe(true);
  });
});

describe("AdminLeavePage: the calendar tab", () => {
  it("the month's address drives the 27-1 window plus the upcoming and holidays reads", async () => {
    renderLeave("/admin/company/leave?tab=calendar&month=2026-11");
    await screen.findByText("Who is away");
    const monthRead = sentRequests().find(
      (r) => r.url.includes("from=2026-11-01") && r.url.includes("to=2026-11-30"),
    );
    expect(monthRead?.url.includes("status=approved")).toBe(true);
    expect(monthRead?.url.includes("limit=50")).toBe(true);
    // The upcoming window is its own approved read with from/to of its own
    // (today + 60 days — today is the viewer's clock, so only its shape).
    expect(
      sentRequests().some((r) => r.url.includes("status=approved") && r.url.includes("from=")),
    ).toBe(true);
    expect(sentRequests().some((r) => r.url.endsWith("/attendance/holidays"))).toBe(true);
  });

  it("renders who is out and the day modal names them", async () => {
    renderLeave("/admin/company/leave?tab=calendar&month=2026-11");
    // An occupied day is a plain button — no grid roles (the CSS layout has
    // no rows to back them) — and its accessible name carries WHO is away,
    // not just how many.
    const cell = await screen.findByRole("button", { name: "2026-11-17: Asha V away" });
    fireEvent.click(cell);
    const dialog = await screen.findByRole("dialog", { name: "Who is away this day" });
    expect(within(dialog).getByText(/Asha V/)).toBeInTheDocument();
    expect(within(dialog).getByText("17–20 Nov")).toBeInTheDocument();
    expect(within(dialog).getByText(/Back on/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Family function/)).toBeInTheDocument();
    // Only Asha is away on the 17th — Bunty's single day is the 18th, and
    // the grid cell and the rail name them twice over.
    expect(within(dialog).queryByText("Bunty R")).toBeNull();
    expect(screen.getAllByText("Bunty R").length).toBeGreaterThanOrEqual(2);
  });

  it("an empty month is honest on the grid and the rail", async () => {
    setRespond((url) => {
      const { pathname, search } = new URL(url);
      if (pathname.endsWith("/users/me")) return respondDefault(url);
      if (pathname.endsWith("/attendance/leave") && search.includes("from=")) {
        return jsonResponse({ data: [], nextCursor: null, hasMore: false });
      }
      return respondDefault(url);
    });
    renderLeave("/admin/company/leave?tab=calendar&month=2027-05");
    expect(await screen.findByText("No approved leave overlaps this month.")).toBeInTheDocument();
    expect(screen.getByText("Nothing scheduled.")).toBeInTheDocument();
  });

  it("more requests than fit say so, never a complete-looking grid", async () => {
    setRespond((url) => {
      const { pathname, search } = new URL(url);
      if (pathname.endsWith("/users/me")) return respondDefault(url);
      if (pathname.endsWith("/attendance/leave") && search.includes("from=2026")) {
        return jsonResponse({ data: listRows(), nextCursor: "c-1", hasMore: true });
      }
      return respondDefault(url);
    });
    renderLeave("/admin/company/leave?tab=calendar&month=2026-11");
    expect(await screen.findByText(/More requests exist than fit here/)).toBeInTheDocument();
  });
});

describe("AdminLeavePage: access", () => {
  it("a dead session lands on /login", async () => {
    setRespond((url) => {
      const { pathname } = new URL(url);
      if (pathname.endsWith("/users/me")) return jsonResponse({}, 401);
      return respondDefault(url);
    });
    renderLeave("/admin/company/leave");
    expect(await screen.findByText("Log in to Fenzit")).toBeInTheDocument();
  });
});
