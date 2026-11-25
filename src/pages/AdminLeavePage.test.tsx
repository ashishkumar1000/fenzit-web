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
import { LeaveDayModal } from "../features/admin/components/LeaveDayModal";
import { resetLeaveSummaryCacheForTests } from "../features/admin/leaveSummaryCache";
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
  // The shared summary cache is module state — one test's answer must never
  // serve the next test's pills or badge.
  resetLeaveSummaryCacheForTests();
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
    leaveTypeId: "t-earned",
    leaveTypeCode: "earned",
    leaveTypeName: "Earned Leave",
    startDate: "2026-11-17",
    endDate: "2026-11-20",
    part: "full_day",
    reason: "Family function",
    // Noon UTC: the instant's local calendar day agrees across every
    // realistic viewer timezone, so the viewer-local "requested on" pin
    // never flips on a west-of-Greenwich clock.
    createdAt: "2026-11-10T12:30:00.000Z",
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
      leaveTypeId: "t-sick",
      leaveTypeCode: "sick",
      leaveTypeName: "Sick Leave",
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
      // The pending r-1 request's four days already debit the balance — the
      // derived remaining is what the design draws "after approval".
      consumed: 4,
      remaining: 4,
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
  if (/\/attendance\/leave\/[^/]+\/coverage$/.test(pathname)) {
    return jsonResponse({
      officeName: "MG Road Office",
      availableCount: 1,
      onDutyName: "Priya Sharma",
    });
  }
  if (pathname.endsWith("/attendance/leave/summary")) {
    return jsonResponse({
      activeEmployees: 10,
      counts: { pending: 1, approved: 1, revoked: 0, cancelled: 0, rejected: 0 },
    });
  }
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
    const earnedEditor = screen.getByText("Earned Leave rules").closest("section")!;
    // The awake tile carries no asleep mark — the primary glow is only for
    // a live type.
    expect(earnedEditor.querySelector("[data-asleep]")).toBeNull();
    fireEvent.click(onOff);
    // The header chip flips with the local state — the editor is asleep.
    expect(within(earnedEditor).getByText("inactive")).toBeInTheDocument();
    // The header tile joins the asleep treatment (the CSS grays it from
    // [data-asleep], the off-card family's grays).
    expect(earnedEditor.querySelector("[data-asleep]")).not.toBeNull();
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
  it("the pills carry the summary's counts, and a pill change is an address that drops the selection", async () => {
    renderLeave("/admin/company/leave?tab=requests&status=pending");
    await screen.findAllByText("Asha V");
    expect(
      sentRequests().some((r) => r.url.includes("status=pending") && r.url.includes("limit=20")),
    ).toBe(true);
    // The pills read the whole tenant's counts (the summary read), whatever
    // the page's own filter is.
    expect(screen.getByRole("link", { name: "Needs review 1" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "All 2" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: "Approved 1" }));
    await waitFor(() => {
      expect(sentRequests().some((r) => r.url.includes("status=approved"))).toBe(true);
    });
    // A status change restarts the walk — no selected= rides along.
    expect(
      sentRequests().every(
        (r) => !r.url.includes("status=approved") || !r.url.includes("selected="),
      ),
    ).toBe(true);
  });

  it("the meta chips count the tenant, not the page", async () => {
    renderLeave("/admin/company/leave?tab=requests&status=pending");
    await screen.findAllByText("Asha V");
    expect(screen.getByText("2 total")).toBeInTheDocument();
    expect(screen.getByText("1 needs review")).toBeInTheDocument();
    expect(screen.getByText("Newest first")).toBeInTheDocument();
  });

  it("the card is always present — with no selected= the first row is picked and its balances and coverage read", async () => {
    renderLeave("/admin/company/leave?tab=requests");
    const card = await screen.findByRole("complementary", { name: "Request details" });
    await waitFor(() => {
      expect(sentRequests().some((r) => r.url.endsWith("/u-emp-1/balances"))).toBe(true);
      expect(sentRequests().some((r) => r.url.endsWith("/r-1/coverage"))).toBe(true);
    });
    expect(screen.getByRole("link", { name: /Asha V/ }).getAttribute("aria-current")).toBe("true");
    expect(within(card).getByText("Asha V")).toBeInTheDocument();
  });

  it("the card renders the facts, the span day by day, every allowance and the coverage line", async () => {
    renderLeave("/admin/company/leave?tab=requests&selected=r-1");
    const card = await screen.findByRole("complementary", { name: "Request details" });
    expect(within(card).getByText(/Family function/)).toBeInTheDocument();
    expect(within(card).getByText("4 Working Days")).toBeInTheDocument();
    expect(within(card).getByText("17 Nov – 20 Nov 2026")).toBeInTheDocument();
    // Requested on — the wire's UTC instant read as the filer's local day
    // (localIsoDate), the year kept (fmtDay).
    expect(within(card).getByText("10 Nov 2026")).toBeInTheDocument();
    // The span, day by day — each date with its own state word.
    const strip = within(card).getByLabelText("Days, one by one");
    expect(within(strip).getAllByText("Pending")).toHaveLength(4);
    // Every accrual-bearing type's balance, the request's own first and
    // tagged; the zero-gross sick type says so beside the blocks.
    expect(
      within(card).getByText("Earned Leave days allowance — 4 days remaining"),
    ).toBeInTheDocument();
    expect(within(card).getByText("this request")).toBeInTheDocument();
    expect(within(card).getByText("4 days after approval")).toBeInTheDocument();
    expect(within(card).getByText("4 requested")).toBeInTheDocument();
    expect(within(card).getByText("8 total allowance")).toBeInTheDocument();
    // The provenance line: earned's total sits all in accrual here — no
    // credit, no carry-forward, so only the one part speaks.
    expect(within(card).getByText("8 accrued")).toBeInTheDocument();
    expect(within(card).getByText("No balance recorded for Sick Leave.")).toBeInTheDocument();
    expect(
      within(card).getByText(/1 other team member is available in MG Road Office/),
    ).toBeInTheDocument();
    expect(within(card).getByText(/Priya Sharma on duty/)).toBeInTheDocument();
  });

  it("a comp-off request gets the honest line beside the other types' blocks", async () => {
    // Comp-Off rides no balance — the wire's balances exclude it — so the
    // subject is never found: the quiet explains line leads and every
    // accrual-bearing type's block still renders beside it (the composition
    // branch the typed fixtures never reach).
    const compOff = leaveRow({
      id: "r-3",
      employeeId: "u-emp-3",
      employeeName: "Chitra N",
      employeeCode: "EMP-003",
      leaveTypeId: "t-comp",
      leaveTypeCode: "comp_off",
      leaveTypeName: "Comp Off",
      status: "pending",
      startDate: "2026-11-21",
      endDate: "2026-11-21",
      workingDays: 1,
      totalDays: 1,
      reason: "",
      dates: [{ date: "2026-11-21", state: "pending" }],
    });
    setRespond((url) => {
      const { pathname, search } = new URL(url);
      if (pathname.endsWith("/attendance/leave") && !search.includes("from=")) {
        return jsonResponse({ data: [compOff], nextCursor: null, hasMore: false });
      }
      return respondDefault(url);
    });
    renderLeave("/admin/company/leave?tab=requests&selected=r-3");
    const card = await screen.findByRole("complementary", { name: "Request details" });
    // The request's own type says it has no balance…
    expect(within(card).getByText("No balance recorded for Comp Off.")).toBeInTheDocument();
    // …and the other types' blocks stay beside it — earned's full block,
    // sick's zero-gross line.
    expect(
      within(card).getByText("Earned Leave days allowance — 4 days remaining"),
    ).toBeInTheDocument();
    expect(within(card).getByText("No balance recorded for Sick Leave.")).toBeInTheDocument();
  });

  it("the breakdown names the total's provenance, and a turned-off type wears the chip", async () => {
    // Four shapes in one panel: the subject's mixed total (credit + accrual
    // + carry-forward), an off type answering from its credit alone, a
    // negative-corrected credit whose exactly-1 remaining reads singular,
    // and a gross-zero off type whose used days still speak on the
    // collapsed line.
    setRespond((url) => {
      const { pathname } = new URL(url);
      if (pathname.endsWith("/u-emp-1/balances")) {
        return jsonResponse([
          {
            typeId: "t-earned",
            code: "earned",
            name: "Earned Leave",
            accrualMode: "monthly",
            accrualDays: 1,
            enabled: true,
            credits: 12,
            accrued: 1,
            carryForward: 2,
            consumed: 8,
            remaining: 7,
          },
          {
            typeId: "t-sick",
            code: "sick",
            name: "Sick Leave",
            accrualMode: "monthly",
            accrualDays: 0.5,
            enabled: false,
            credits: 8,
            accrued: 0,
            carryForward: 0,
            consumed: 2,
            remaining: 6,
          },
          {
            // An enabled row (the backend answers accrued 0 for every
            // disabled type — an off fixture row would encode a shape the
            // contract forbids) carrying a negative-corrected credit and
            // an exactly-1 remaining, which the heading reads singular.
            typeId: "t-casual",
            code: "casual",
            name: "Casual Leave",
            accrualMode: "annual",
            accrualDays: 5,
            enabled: true,
            credits: -2,
            accrued: 4,
            carryForward: 0,
            consumed: 1,
            remaining: 1,
          },
          {
            typeId: "t-offday",
            code: "offday",
            name: "Off Day",
            accrualMode: "monthly",
            accrualDays: 1,
            enabled: false,
            credits: 0,
            accrued: 0,
            carryForward: 0,
            consumed: 1.5,
            remaining: -1.5,
          },
        ]);
      }
      return respondDefault(url);
    });
    renderLeave("/admin/company/leave?tab=requests&selected=r-1");
    const card = await screen.findByRole("complementary", { name: "Request details" });
    // Earned leads (the subject): the mixed breakdown names every part.
    expect(
      within(card).getByText("12 credited · 1 accrued · 2 carried forward"),
    ).toBeInTheDocument();
    expect(within(card).getByText("15 total allowance")).toBeInTheDocument();
    // The off sick row still answers — 8 credited − 2 used — under its chip.
    expect(
      within(card).getByText("Sick Leave days allowance — 6 days remaining"),
    ).toBeInTheDocument();
    expect(within(card).getByText("8 credited")).toBeInTheDocument();
    // A corrected (negative) credit reads with its sign; zero parts stay
    // quiet; exactly 1 remaining reads singular.
    expect(
      within(card).getByText("Casual Leave days allowance — 1 day remaining"),
    ).toBeInTheDocument();
    expect(within(card).getByText("-2 credited · 4 accrued")).toBeInTheDocument();
    // The gross-zero off row collapses — chip and its used days still speak
    // on the same quiet line, so the name matches within the fuller text.
    expect(within(card).getByText(/No balance recorded for Off Day\./)).toBeInTheDocument();
    expect(within(card).getByText(/1\.5 days used this year\./)).toBeInTheDocument();
    // One chip per off row: sick and offday.
    expect(within(card).getAllByText("Turned Off")).toHaveLength(2);
  });

  it("the strip speaks each day's own state — a split span reads state by state", async () => {
    const split = leaveRow({
      id: "r-4",
      employeeId: "u-emp-4",
      employeeName: "Devika U",
      employeeCode: "EMP-004",
      status: "approved",
      dates: [
        { date: "2026-11-17", state: "approved" },
        { date: "2026-11-18", state: "pending" },
        { date: "2026-11-19", state: "rejected" },
        { date: "2026-11-20", state: "cancelled" },
      ],
    });
    setRespond((url) => {
      const { pathname, search } = new URL(url);
      if (pathname.endsWith("/attendance/leave") && !search.includes("from=")) {
        return jsonResponse({ data: [split], nextCursor: null, hasMore: false });
      }
      return respondDefault(url);
    });
    renderLeave("/admin/company/leave?tab=requests&selected=r-4");
    const card = await screen.findByRole("complementary", { name: "Request details" });
    const strip = within(card).getByLabelText("Days, one by one");
    expect(within(strip).getByText("Approved")).toBeInTheDocument();
    expect(within(strip).getByText("Pending")).toBeInTheDocument();
    expect(within(strip).getByText("Rejected")).toBeInTheDocument();
    expect(within(strip).getByText("Cancelled")).toBeInTheDocument();
  });

  it("Close dismisses the card until a row tap asks for it again", async () => {
    renderLeave("/admin/company/leave?tab=requests");
    const card = await screen.findByRole("complementary", { name: "Request details" });
    fireEvent.click(within(card).getByRole("button", { name: "Close details" }));
    // Dismissed is local state — the card is gone without a refetch.
    const readsBefore = sentRequests().length;
    expect(screen.queryByRole("complementary", { name: "Request details" })).toBeNull();
    // A row tap is an explicit ask — the card returns for that row. During
    // the navigation flight the old selection's card is still mounted (React
    // Router keeps the previous UI until the new loader data lands), so wait
    // for Bunty's name, not merely for a card.
    fireEvent.click(screen.getByRole("link", { name: /Bunty R/ }));
    await waitFor(() => {
      const reopened = screen.getByRole("complementary", { name: "Request details" });
      expect(within(reopened).getByText("Bunty R")).toBeInTheDocument();
    });
    expect(sentRequests().length).toBeGreaterThan(readsBefore);
  });

  it("an active search or month window quiets the counts — pills and chips go bare", async () => {
    renderLeave("/admin/company/leave?tab=requests&q=Asha");
    await screen.findAllByText("Asha V");
    // The counts answer the tenant, the list answers the needle — the
    // numbers go quiet rather than contradict the filtered list.
    expect(screen.queryByRole("link", { name: /Needs review \d/ })).toBeNull();
    expect(screen.getByRole("link", { name: "Needs review" })).toBeInTheDocument();
    expect(screen.queryByText("2 total")).toBeNull();
    expect(screen.getByText("Newest first")).toBeInTheDocument();
    // The quiet pill still navigates — the filter is an address even bare.
    fireEvent.click(screen.getByRole("link", { name: "Needs review" }));
    await waitFor(() => {
      expect(sentRequests().some((r) => r.url.includes("status=pending"))).toBe(true);
    });
    expect(screen.getByRole("link", { name: "Needs review" })).toBeInTheDocument();
  });

  it("a month window quiets the counts the same way — no search needle needed", async () => {
    renderLeave("/admin/company/leave?tab=requests&month=2026-11");
    await screen.findAllByText("Asha V");
    expect(screen.queryByRole("link", { name: /Needs review \d/ })).toBeNull();
    expect(screen.getByRole("link", { name: "Needs review" })).toBeInTheDocument();
    expect(screen.queryByText("2 total")).toBeNull();
    expect(screen.getByText("Newest first")).toBeInTheDocument();
  });

  it("approve posts the typed note; decline posts the reason", async () => {
    renderLeave("/admin/company/leave?tab=requests&selected=r-1");
    await screen.findByRole("complementary", { name: "Request details" });
    fireEvent.change(screen.getByLabelText(/Approval note/), {
      target: { value: "Covered by Priya" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Approve Request" }));
    await waitFor(() => {
      const post = sentRequests().find((r) => r.url.endsWith("/approve"));
      expect(post).toBeDefined();
      expect(post?.body).toEqual({ note: "Covered by Priya" });
    });
    fireEvent.change(screen.getByLabelText(/Approval note/), {
      target: { value: "Team is short that week" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Decline Request" }));
    await waitFor(() => {
      const post = sentRequests().find((r) => r.url.endsWith("/reject"));
      expect(post?.body).toEqual({ reason: "Team is short that week" });
    });
  });

  it("an empty note approves with no body", async () => {
    renderLeave("/admin/company/leave?tab=requests&selected=r-1");
    await screen.findByRole("complementary", { name: "Request details" });
    fireEvent.click(screen.getByRole("button", { name: "Approve Request" }));
    await waitFor(() => {
      const post = sentRequests().find((r) => r.url.endsWith("/approve"));
      expect(post).toBeDefined();
      expect(post?.body).toBeUndefined();
    });
  });

  it("a decision refreshes the sidebar badge — the count rides the action's revalidation", async () => {
    // The layout's badge read and the pills' read share the module cache, so
    // the first load is ONE summary fetch (the parallel pair collapsed);
    // the decision invalidates it and the action's revalidation — whichever
    // loader revalidates first — reads the settled count, its twin taking
    // the fresh answer from the cache.
    let summaryCalls = 0;
    setRespond((url) => {
      const { pathname } = new URL(url);
      if (pathname.endsWith("/attendance/leave/summary")) {
        summaryCalls += 1;
        return jsonResponse({
          activeEmployees: 10,
          counts: {
            pending: summaryCalls <= 1 ? 1 : 0,
            approved: 1,
            revoked: 0,
            cancelled: 0,
            rejected: 0,
          },
        });
      }
      return respondDefault(url);
    });
    renderLeave("/admin/company/leave?tab=requests&selected=r-1");
    expect(
      await screen.findByRole("link", { name: "Leave – 1 request waiting" }),
    ).toBeInTheDocument();
    // The dedupe itself: badge loader + pills loader = one network call.
    expect(summaryCalls).toBe(1);
    fireEvent.click(screen.getByRole("button", { name: "Approve Request" }));
    await waitFor(() => {
      expect(summaryCalls).toBeGreaterThanOrEqual(2);
      expect(screen.getByRole("link", { name: "Leave" })).toBeInTheDocument();
    });
  });

  it("revoke rides the approved row's card — the dialog keeps its required-reason gate, the zero-gross balance says so", async () => {
    renderLeave("/admin/company/leave?tab=requests&status=approved&selected=r-2");
    const card = await screen.findByRole("complementary", { name: "Request details" });
    expect(within(card).getByText("No balance recorded for Sick Leave.")).toBeInTheDocument();
    fireEvent.click(within(card).getByRole("button", { name: "Revoke" }));
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

  it("a stale selected id falls back to the first row — the card never goes blank", async () => {
    renderLeave("/admin/company/leave?tab=requests&selected=r-ghost");
    const card = await screen.findByRole("complementary", { name: "Request details" });
    expect(within(card).getByText("Asha V")).toBeInTheDocument();
    expect(sentRequests().some((r) => r.url.endsWith("/u-emp-1/balances"))).toBe(true);
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
    const card = await screen.findByRole("complementary", { name: "Request details" });
    expect(within(card).getByText(/The balance could not be loaded/)).toBeInTheDocument();
    expect(within(card).getByText(/Family function/)).toBeInTheDocument();
  });

  it("a failed coverage read degrades to a quiet line — the card stays", async () => {
    setRespond((url) => {
      const { pathname } = new URL(url);
      if (/\/attendance\/leave\/[^/]+\/coverage$/.test(pathname)) {
        return jsonResponse({ message: "boom" }, 500);
      }
      return respondDefault(url);
    });
    renderLeave("/admin/company/leave?tab=requests&selected=r-1");
    const card = await screen.findByRole("complementary", { name: "Request details" });
    expect(within(card).getByText("Coverage could not be checked.")).toBeInTheDocument();
    expect(within(card).getByText(/Family function/)).toBeInTheDocument();
  });

  it("an older backend without counts renders bare pills — the labels stay", async () => {
    setRespond((url) => {
      const { pathname } = new URL(url);
      if (pathname.endsWith("/attendance/leave/summary")) {
        return jsonResponse({ activeEmployees: 10 });
      }
      return respondDefault(url);
    });
    renderLeave("/admin/company/leave?tab=requests");
    await screen.findAllByText("Asha V");
    // The chips are gone — but the card's allowance legend also says "total",
    // so the absence must be pinned to the chips' own strings.
    expect(screen.queryByText("1 needs review")).toBeNull();
    expect(screen.queryByText("2 total")).toBeNull();
    expect(screen.getByRole("link", { name: "Needs review" })).toBeInTheDocument();
  });

  it("the search is an address — Enter carries the needle and restarts the walk", async () => {
    renderLeave("/admin/company/leave?tab=requests");
    await screen.findAllByText("Asha V");
    fireEvent.change(screen.getByLabelText("Search by person or leave reason"), {
      target: { value: "Asha" },
    });
    fireEvent.submit(screen.getByRole("search"));
    await waitFor(() => {
      expect(sentRequests().some((r) => r.url.includes("q=Asha"))).toBe(true);
    });
    expect(
      sentRequests().every((r) => !r.url.includes("q=Asha") || !r.url.includes("cursor=")),
    ).toBe(true);
  });

  it("the month window is an address — stepping months re-windows the 27-1 read, All months clears it", async () => {
    renderLeave("/admin/company/leave?tab=requests&month=2026-11");
    // The month read's rows ride respondDefault's from= branch (the calendar
    // fixture) — the wire, not the rows, is what this test pins.
    await waitFor(() => {
      expect(
        sentRequests().some(
          (r) => r.url.includes("from=2026-11-01") && r.url.includes("to=2026-11-30"),
        ),
      ).toBe(true);
    });
    // The loader keeps flying after the list fetch (summary, balances,
    // coverage) — the DOM is empty until the whole loader settles, so every
    // step waits on its element, never queries bare.
    fireEvent.click(await screen.findByRole("link", { name: "Previous month, October 2026" }));
    await waitFor(() => {
      expect(
        sentRequests().some(
          (r) => r.url.includes("from=2026-10-01") && r.url.includes("to=2026-10-31"),
        ),
      ).toBe(true);
    });
    fireEvent.click(await screen.findByRole("link", { name: "All months" }));
    await waitFor(() => {
      // The list fetch never carries `tab=` — that lives in the address only.
      // All time = a plain windowless page read.
      expect(
        sentRequests().some(
          (r) =>
            r.url.includes("/attendance/leave?") &&
            !r.url.includes("from=") &&
            !r.url.includes("month=") &&
            !r.url.includes("cursor="),
        ),
      ).toBe(true);
    });
  });

  it("the pager carries the cursor — the card stays present across the walk", async () => {
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
    await screen.findAllByText("Asha V");
    fireEvent.click(await screen.findByRole("link", { name: "Older ›" }));
    await waitFor(() => {
      expect(sentRequests().some((r) => r.url.includes("cursor=c-9"))).toBe(true);
    });
    expect(screen.getByRole("complementary", { name: "Request details" })).toBeInTheDocument();
  });

  it("the pager keeps the address's filters — the cursor read still searches and windows the month", async () => {
    setRespond((url) => {
      const { pathname, search } = new URL(url);
      if (pathname.endsWith("/users/me")) return respondDefault(url);
      if (pathname.endsWith("/attendance/leave")) {
        const next = search.includes("cursor=") ? null : "c-9";
        return jsonResponse({ data: listRows(), nextCursor: next, hasMore: next !== null });
      }
      return respondDefault(url);
    });
    renderLeave("/admin/company/leave?tab=requests&q=Asha&month=2026-11");
    await screen.findAllByText("Asha V");
    fireEvent.click(await screen.findByRole("link", { name: "Older ›" }));
    await waitFor(() => {
      const paged = sentRequests().find((r) => r.url.includes("cursor=c-9"));
      expect(paged).toBeDefined();
      expect(paged?.url.includes("q=Asha")).toBe(true);
      expect(paged?.url.includes("from=2026-11-01")).toBe(true);
      expect(paged?.url.includes("to=2026-11-30")).toBe(true);
    });
  });
});

describe("AdminLeavePage: the calendar tab", () => {
  /** The date formatters pin en-IN, but the ICU data behind Intl ships with
   *  the runtime — the CI runner's libicu moves en-IN's comma (it renders
   *  "Tuesday 17 Nov, 2026" where the dev machine says "Tuesday, 17 Nov
   *  2026"), so weekday-bearing pins match the words and tolerate the
   *  punctuation. */
  function icuLoose(expected: string): RegExp {
    return new RegExp(expected.replace(/[,\s]+/g, "[,\\s]+"));
  }

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
    // The rail's pulse needs the team size — the summary read rides along.
    expect(sentRequests().some((r) => r.url.endsWith("/attendance/leave/summary"))).toBe(true);
  });

  it("renders who is out and the day modal names them", async () => {
    renderLeave("/admin/company/leave?tab=calendar&month=2026-11");
    // An occupied day is a plain button — no grid roles (the CSS layout has
    // no rows to back them) — and its accessible name carries WHO is away,
    // not just how many.
    const cell = await screen.findByRole("button", { name: "2026-11-17: Asha V away" });
    fireEvent.click(cell);
    const dialog = await screen.findByRole("dialog", { name: "Who is away this day" });
    expect(
      within(dialog).getByText(icuLoose("Leaves on Tuesday, 17 Nov 2026")),
    ).toBeInTheDocument();
    expect(within(dialog).getByText(/Asha V/)).toBeInTheDocument();
    expect(within(dialog).getByText("17–20 Nov (4 days)")).toBeInTheDocument();
    expect(within(dialog).getByText(icuLoose("Return Date: Mon, 23 Nov 2026"))).toBeInTheDocument();
    expect(within(dialog).getByText("Day 1 of 4")).toBeInTheDocument();
    expect(within(dialog).getByText(/Family function/)).toBeInTheDocument();
    expect(within(dialog).getByText("Earned Leave (EL)")).toBeInTheDocument();
    // Only Asha is away on the 17th — Bunty's single day is the 18th, named
    // on the grid's person line (the rail is the pulse/holidays/breakdown
    // cards now; names live in the grid cells).
    expect(within(dialog).queryByText("Bunty R")).toBeNull();
    expect(screen.getByText("Bunty R")).toBeInTheDocument();
  });

  it("the modal steps to the next day — Bunty's single sick day, the type chips, the filters, the footer", async () => {
    renderLeave("/admin/company/leave?tab=calendar&month=2026-11");
    fireEvent.click(await screen.findByRole("button", { name: "2026-11-17: Asha V away" }));
    const dialog = await screen.findByRole("dialog", { name: "Who is away this day" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Next day" }));
    expect(
      within(dialog).getByText(icuLoose("Leaves on Wednesday, 18 Nov 2026")),
    ).toBeInTheDocument();
    // The out-strip counts both, per type, and the filter pills follow —
    // the viewed day is stepped off today, so the label is "Out", not
    // "Out Today" (that claim belongs to the real today only).
    expect(within(dialog).getByText("2 Out:")).toBeInTheDocument();
    expect(within(dialog).getByText("1 Earned Leave")).toBeInTheDocument();
    expect(within(dialog).getByText("1 Sick Leave")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "All (2)" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Sick (1)" })).toBeInTheDocument();
    // Asha is mid-span on the 18th; Bunty's day is its own single-day leave.
    expect(within(dialog).getByText("Day 2 of 4")).toBeInTheDocument();
    expect(within(dialog).getByText("Single Day Leave")).toBeInTheDocument();
    expect(within(dialog).getByText("Sick Leave (SL)")).toBeInTheDocument();
    expect(within(dialog).getByText("All Approved")).toBeInTheDocument();
    expect(within(dialog).getByText("2 of 2 requests approved.")).toBeInTheDocument();
    // The type filter narrows the cards.
    fireEvent.click(within(dialog).getByRole("button", { name: "Sick (1)" }));
    expect(within(dialog).getByText("Bunty R")).toBeInTheDocument();
    expect(within(dialog).queryByText("Asha V")).toBeNull();
  });

  it("the day modal speaks today when the viewed day is today", () => {
    render(
      <LeaveDayModal
        date="2026-11-18"
        byDate={new Map([["2026-11-18", [listRows()[1]]]])}
        today="2026-11-18"
        close={() => {}}
      />,
    );
    expect(screen.getByText(icuLoose("Leaves on Wednesday, 18 Nov 2026"))).toBeInTheDocument();
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("Single Day Leave (Today only)")).toBeInTheDocument();
    expect(screen.getByText("1 of 1 requests approved.")).toBeInTheDocument();
  });

  it("a stepped-to day nobody covers answers honestly empty", () => {
    render(
      <LeaveDayModal
        date="2026-11-17"
        byDate={new Map([["2026-11-17", [listRows()[0]]]])}
        today="2026-11-18"
        close={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Next day" }));
    expect(screen.getByText(icuLoose("Leaves on Wednesday, 18 Nov 2026"))).toBeInTheDocument();
    expect(screen.getByText("No one is recorded away this day.")).toBeInTheDocument();
    // The walked-to day is the fixture's today — the chip follows the view.
    expect(screen.getByText("Today")).toBeInTheDocument();
  });

  it("the out-strip's Out Today claim belongs to the real today only — a stepped day reads Out", () => {
    render(
      <LeaveDayModal
        date="2026-11-17"
        byDate={
          new Map([
            ["2026-11-17", [listRows()[0]]],
            ["2026-11-18", [listRows()[1]]],
          ])
        }
        today="2026-11-18"
        close={() => {}}
      />,
    );
    // Viewing yesterday: the strip must not say "Today".
    expect(screen.getByText("1 Out:")).toBeInTheDocument();
    expect(screen.queryByText("1 Out Today:")).toBeNull();
    // Stepping onto the fixture's today flips the label honestly.
    fireEvent.click(screen.getByRole("button", { name: "Next day" }));
    expect(screen.getByText("1 Out Today:")).toBeInTheDocument();
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
    // The rail stays honest on an empty month: zero pulse tiles, an empty
    // breakdown, and the meter stating its own rule.
    expect(screen.getByText("Team on leave")).toBeInTheDocument();
    expect(screen.getByText("No leave overlaps this month.")).toBeInTheDocument();
    expect(screen.getByText(/of 210 working days free · 10 active/)).toBeInTheDocument();
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

  it("a failed summary read degrades to a meterless pulse — the tab keeps its grid", async () => {
    setRespond((url) => {
      const { pathname } = new URL(url);
      if (pathname.endsWith("/attendance/leave/summary")) {
        return jsonResponse({ message: "boom" }, 500);
      }
      return respondDefault(url);
    });
    renderLeave("/admin/company/leave?tab=calendar&month=2026-11");
    // Like the requests tab's balances read, the summary is degrade-able:
    // its only consumer is the meter, so the meter hides (honestly) and
    // everything else — grid, timeline, rail cards — still shows.
    expect(await screen.findByText("Who is away")).toBeInTheDocument();
    expect(screen.queryByText(/% Available/)).toBeNull();
    expect(screen.getByText(/team size is unavailable right now/)).toBeInTheDocument();
  });

  it("the upcoming window's own hasMore speaks — the timeline never looks complete while truncated", async () => {
    setRespond((url) => {
      const { pathname, search } = new URL(url);
      if (pathname.endsWith("/users/me")) return respondDefault(url);
      if (pathname.endsWith("/attendance/leave") && search.includes("from=")) {
        // The month read (from=2026-11-01) is whole; the upcoming window's
        // read is truncated — its hasMore must survive into the tab.
        if (search.includes("from=2026-11-01")) {
          return jsonResponse({ data: approvedRows(), nextCursor: null, hasMore: false });
        }
        return jsonResponse({ data: approvedRows(), nextCursor: "c-7", hasMore: true });
      }
      return respondDefault(url);
    });
    renderLeave("/admin/company/leave?tab=calendar&month=2026-11");
    await screen.findByText("Who is away");
    // The truncation line belongs to the timeline view — switch to it.
    fireEvent.click(screen.getByRole("button", { name: "Timeline" }));
    expect(
      await screen.findByText(/More approvals exist than fit the upcoming window/),
    ).toBeInTheDocument();
    // The grid's own line stays quiet — only the upcoming window truncated.
    expect(screen.queryByText(/More requests exist than fit here/)).toBeNull();
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
