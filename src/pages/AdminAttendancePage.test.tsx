import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { routes } from "../app/routes";
import { writeSession } from "../services/session";
import { istToday } from "../features/admin/format";
import {
  clearApiBase,
  installFetchMock,
  jsonResponse,
  restoreFetchMock,
  sentRequests,
  setRespond,
  useApiBase,
} from "../testing/fetchMock";

// The attendance page's two tabs (2026-11-14 restructure, console redesign
// 2026-11-20): the running month's table on the first tab, the attendance
// report PDF on the second — each tab fetching only its own data, a dead
// slice degrading to its own retry line, and a hand-typed address landing on
// the right tab. The month tab's chips, office filter, sort and pager are the
// browser's work over the one roster the loader fetched — a filter change is
// an address, not a refetch.

beforeAll(() => {
  useApiBase();
});

afterAll(() => {
  clearApiBase();
});

let monthlyFails: boolean;
let historyFails: boolean;

beforeEach(() => {
  monthlyFails = false;
  historyFails = false;
  installFetchMock();
  setRespond(respondDefault);
});

afterEach(() => {
  restoreFetchMock();
  window.localStorage.clear();
  cleanup();
});

function respondDefault(url: string): Response {
  if (url.endsWith("/users/me")) {
    return jsonResponse({
      id: "u-owner",
      role: "company_admin",
      name: "Ravi Kumar",
      platformAdmin: false,
    });
  }
  if (url.includes("/attendance/monthly")) {
    if (monthlyFails) return jsonResponse({}, 500);
    return jsonResponse({
      from: "2026-11-01",
      to: "2026-11-14",
      employees: [
        {
          employeeId: "u-1",
          employeeName: "Priya Nair",
          officeName: "Andheri",
          summary: {
            daysWorked: 9,
            halfDays: 1,
            lateCount: 2,
            leave: 1,
            weeklyOffs: 2,
            holidays: 1,
            workedOnHoliday: 0,
            absent: 3,
            checkoutMissing: 0,
          },
        },
        {
          employeeId: "u-2",
          employeeName: "Amit Sharma",
          officeName: "Andheri",
          summary: {
            daysWorked: 14,
            halfDays: 0,
            lateCount: 0,
            leave: 0,
            weeklyOffs: 2,
            holidays: 1,
            workedOnHoliday: 0,
            absent: 0,
            checkoutMissing: 1,
          },
        },
        {
          employeeId: "u-3",
          employeeName: "Divya Bhat",
          officeName: null,
          summary: {
            daysWorked: 12,
            halfDays: 2,
            lateCount: 0,
            leave: 0,
            weeklyOffs: 2,
            holidays: 1,
            workedOnHoliday: 0,
            absent: 1,
            checkoutMissing: 0,
          },
        },
      ],
    });
  }
  if (url.includes("/reports?limit=")) {
    if (historyFails) return jsonResponse({}, 500);
    return jsonResponse({ data: [], nextCursor: null, hasMore: false });
  }
  throw new TypeError(`offline in tests: ${url}`);
}

function renderAttendance(entry = "/admin/company/attendance"): void {
  writeSession({ token: "tok-1", name: "Ravi" });
  const router = createMemoryRouter(routes, { initialEntries: [entry] });
  render(<RouterProvider router={router} />);
}

async function card(name: string): Promise<HTMLElement> {
  const heading = await screen.findByRole("heading", { name });
  const section = heading.closest("section");
  if (section === null) throw new Error(`no card titled ${name}`);
  return section;
}

describe("AdminAttendancePage: the month tab", () => {
  it("lists each employee's summary under the server's range", async () => {
    renderAttendance();
    const month = await card("Attendance this month");
    const priya = within(month).getByText("Priya Nair").closest("tr");
    if (priya === null) throw new Error("no row for Priya");
    expect(within(priya).getByText("Andheri")).toBeInTheDocument();
    // The range in the meta is the server's answer, not a local guess.
    expect(within(month).getByText(/1 Nov .*– .*14 Nov/)).toBeInTheDocument();
    // Absence is the one graded status — it carries the status styling.
    expect(within(priya).getByText("3")).toBeInTheDocument();
  });

  it("sends the running month's window, not a hand-made range", async () => {
    renderAttendance();
    await card("Attendance this month");
    const call = sentRequests().find((r) => r.url.includes("/attendance/monthly"));
    const query = new URL(call?.url ?? "").searchParams;
    expect(query.get("from")).toBe(`${istToday().slice(0, 7)}-01`);
    expect(query.get("to")).toBe(istToday());
  });

  it("fails loudly with a retry, keeping the tab strip", async () => {
    monthlyFails = true;
    renderAttendance();
    expect(await screen.findByText(/This page could not load/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "This month" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Report" })).toBeInTheDocument();
  });
});

describe("AdminAttendancePage: the report tab", () => {
  it("shows the report card with its window pickers and download, no month table", async () => {
    renderAttendance("/admin/company/attendance?tab=report");
    const report = await card("Attendance report");
    expect(within(report).getByRole("button", { name: "Download report" })).toBeInTheDocument();
    expect(within(report).getByText(/A PDF of attendance for all offices/)).toBeInTheDocument();
    expect(screen.queryByText("Priya Nair")).toBeNull();
    // A tab the user never opened costs nothing.
    expect(sentRequests().some((r) => r.url.includes("/attendance/monthly"))).toBe(false);
  });

  it("degrades a dead history to its own retry line inside the card", async () => {
    historyFails = true;
    renderAttendance("/admin/company/attendance?tab=report");
    const report = await card("Attendance report");
    expect(within(report).getByText(/The report history could not load/)).toBeInTheDocument();
    // The pickers still work — the history is not the whole tab.
    expect(within(report).getByRole("button", { name: "Download report" })).toBeInTheDocument();
  });

  it("holds the download and says why when a date was cleared", async () => {
    renderAttendance("/admin/company/attendance?tab=report");
    const report = await card("Attendance report");
    const from = within(report).getByLabelText("From") as HTMLInputElement;
    fireEvent.change(from, { target: { value: "" } });
    const button = within(report).getByRole("button", { name: "Download report" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(within(report).getByText("Pick both dates to generate the report.")).toBeInTheDocument();
  });
});

describe("AdminAttendancePage: the tabs are addresses", () => {
  it("marks the active tab and rides the tab on the link", async () => {
    renderAttendance();
    await card("Attendance this month");
    const month = screen.getByRole("link", { name: "This month" });
    // The first tab is the bare address; the strip's other tabs carry ?tab=.
    expect(month).toHaveAttribute("href", "/admin/company/attendance");
    expect(month).toHaveAttribute("aria-current", "page");
    const report = screen.getByRole("link", { name: "Report" });
    expect(report).toHaveAttribute("href", "/admin/company/attendance?tab=report");
    expect(report.getAttribute("aria-current")).toBeNull();
  });

  it("marks the report tab active on its own address", async () => {
    renderAttendance("/admin/company/attendance?tab=report");
    await card("Attendance report");
    expect(screen.getByRole("link", { name: "Report" })).toHaveAttribute("aria-current", "page");
    expect(
      screen.getByRole("link", { name: "This month" }).getAttribute("aria-current"),
    ).toBeNull();
  });
});

describe("AdminAttendancePage: the owner's console shell", () => {
  it("greets the owner by the loader's name, wears the Owner pill and breadcrumbs the console with a single h1", async () => {
    renderAttendance();
    await card("Attendance this month");
    // The greeting is the loader's users/me name ("Ravi Kumar"), not the
    // session's short name ("Ravi").
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Hello, Ravi Kumar");
    expect(screen.getByText("Owner")).toBeTruthy();
    expect(screen.getByLabelText("Breadcrumb").textContent).toBe("Console›Attendance");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("sums the whole roster into the four tally tiles", async () => {
    renderAttendance();
    await card("Attendance this month");
    const tileOf = (label: string): HTMLElement => {
      const tile = screen.getByText(label).closest("div[data-tone]");
      if (tile === null) throw new Error(`no tile labelled ${label}`);
      return tile as HTMLElement;
    };
    // 9+14+12 worked · 1+0+2 half · 2+0+0 late · 1 leave · 3+0+1 absent.
    expect(within(tileOf("Worked days")).getByText("35")).toBeTruthy();
    expect(within(tileOf("Half days & late")).getByText("5")).toBeTruthy();
    expect(
      within(tileOf("Half days & late")).getByText("3 half days · 2 late arrivals"),
    ).toBeTruthy();
    expect(within(tileOf("On approved leave")).getByText("1")).toBeTruthy();
    expect(within(tileOf("Absent graded")).getByText("4")).toBeTruthy();
  });

  it("offers the export beside the greeting on the month tab only", async () => {
    renderAttendance();
    await card("Attendance this month");
    expect((screen.getByRole("button", { name: "Export CSV" }) as HTMLButtonElement).disabled).toBe(
      false,
    );
    renderAt("/admin/company/attendance?tab=report");
    await card("Attendance report");
    expect(screen.queryByRole("button", { name: "Export CSV" })).toBeNull();
  });

  it("disables the export and says start tracking when nobody is enrolled yet", async () => {
    setRespond((url) =>
      url.includes("/attendance/monthly")
        ? jsonResponse({ from: "2026-11-01", to: "2026-11-14", employees: [] })
        : respondDefault(url),
    );
    renderAttendance();
    await card("Attendance this month");
    expect(screen.getByText("No employees tracked yet.")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Export CSV" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });
});

describe("AdminAttendancePage: the chips and their whole-roster counts", () => {
  it("counts the roster on each chip", async () => {
    renderAttendance();
    await card("Attendance this month");
    const group = screen.getByRole("group", { name: "Filter employees by attendance" });
    expect(group.textContent).toContain("All3");
    expect(group.textContent).toContain("Present3");
    expect(group.textContent).toContain("Late1");
    expect(group.textContent).toContain("Absent2");
    // Nothing is set yet, so there is nothing to clear.
    expect(screen.queryByRole("button", { name: "Clear all" })).toBeNull();
  });

  it("keeps the counts whole-roster while a chip is active, and marks the chip", async () => {
    renderAttendance("/admin/company/attendance?chip=absent");
    await card("Attendance this month");
    const group = screen.getByRole("group", { name: "Filter employees by attendance" });
    expect(group.textContent).toContain("All3");
    expect(group.textContent).toContain("Present3");
    expect(group.textContent).toContain("Absent2");
    const absent = Array.from(group.querySelectorAll("a")).find((a) =>
      (a.textContent ?? "").startsWith("Absent"),
    );
    expect(absent).toHaveAttribute("aria-current", "true");
  });

  it("a chip click filters the rows in the browser without refetching the month", async () => {
    renderAttendance();
    await card("Attendance this month");
    const group = screen.getByRole("group", { name: "Filter employees by attendance" });
    const absent = Array.from(group.querySelectorAll("a")).find((a) =>
      (a.textContent ?? "").startsWith("Absent"),
    );
    fireEvent.click(absent!);
    // Priya (3 absent days) and Divya (1) stay; Amit (0) drops out.
    expect(screen.getByText("Priya Nair")).toBeTruthy();
    expect(screen.getByText("Divya Bhat")).toBeTruthy();
    expect(screen.queryByText("Amit Sharma")).toBeNull();
    // The expensive monthly endpoint ran once — for the page, not per filter.
    expect(sentRequests().filter((r) => r.url.includes("/attendance/monthly")).length).toBe(1);
  });

  it("Clear all resets every filter and disappears once nothing is set", async () => {
    renderAttendance("/admin/company/attendance?chip=late&office=Andheri&sort=az");
    await card("Attendance this month");
    // The late chip: only Priya (2 late arrivals) shows.
    expect(screen.queryByText("Amit Sharma")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    await waitFor(() => {
      expect(screen.getByText("Amit Sharma")).toBeTruthy();
    });
    expect(screen.queryByRole("button", { name: "Clear all" })).toBeNull();
  });
});

describe("AdminAttendancePage: the office filter and the sort", () => {
  it("narrows to one office and names it on the dropdown", async () => {
    renderAttendance("/admin/company/attendance?office=Andheri");
    const month = await card("Attendance this month");
    expect(within(month).getByText("Amit Sharma")).toBeTruthy();
    expect(within(month).queryByText("Divya Bhat")).toBeNull();
    expect(screen.getByRole("button", { name: "Office: Andheri" })).toBeTruthy();
  });

  it("No office keeps only the employees outside every office", async () => {
    renderAttendance("/admin/company/attendance?office=__none__");
    const month = await card("Attendance this month");
    expect(within(month).getByText("Divya Bhat")).toBeTruthy();
    // Their office cell reads an em dash, not a made-up office.
    expect(within(month).getAllByText("—").length).toBeGreaterThanOrEqual(1);
    expect(within(month).queryByText("Priya Nair")).toBeNull();
    expect(screen.getByRole("button", { name: "Office: No office" })).toBeTruthy();
  });

  it("an office literally named none filters by name; the sentinel still means no office", async () => {
    const oneOff = (name: string, officeName: string | null): Record<string, unknown> => ({
      employeeId: `u-${name}`,
      employeeName: name,
      officeName,
      summary: {
        daysWorked: 10,
        halfDays: 0,
        lateCount: 0,
        leave: 0,
        weeklyOffs: 2,
        holidays: 1,
        workedOnHoliday: 0,
        absent: 0,
        checkoutMissing: 0,
      },
    });
    setRespond((url) => {
      if (url.includes("/attendance/monthly")) {
        return jsonResponse({
          from: "2026-11-01",
          to: "2026-11-14",
          employees: [oneOff("Narmada Roy", "none"), oneOff("Meera Rao", null)],
        });
      }
      return respondDefault(url);
    });
    // A hand-typed ?office=none is an office NAME, never the sentinel.
    renderAttendance("/admin/company/attendance?office=none");
    let month = await card("Attendance this month");
    expect(within(month).getByText("Narmada Roy")).toBeTruthy();
    expect(within(month).queryByText("Meera Rao")).toBeNull();
    renderAt("/admin/company/attendance?office=__none__");
    month = await card("Attendance this month");
    expect(within(month).getByText("Meera Rao")).toBeTruthy();
    expect(within(month).queryByText("Narmada Roy")).toBeNull();
  });

  it("a hand-typed office that outlives its name still says Chosen office and filters to nothing", async () => {
    renderAttendance("/admin/company/attendance?office=Nowhere%20Branch");
    await card("Attendance this month");
    expect(screen.getByRole("button", { name: "Office: Chosen office" })).toBeTruthy();
    expect(screen.getByText(/No employees match these filters/)).toBeTruthy();
    // The pager survives so the owner can page back out of the dead filter.
    expect(screen.getByLabelText("Pages")).toBeTruthy();
  });

  it("orders most-absent first by default, and the name sort rides the address", async () => {
    renderAttendance();
    const month = await card("Attendance this month");
    // Priya (3 absent) before Divya (1) before Amit (0) — late breaks a tie.
    expect(
      within(month)
        .getAllByText(/^(Priya Nair|Amit Sharma|Divya Bhat)$/)
        .map((n) => n.textContent),
    ).toEqual(["Priya Nair", "Divya Bhat", "Amit Sharma"]);
    expect(screen.getByRole("button", { name: "Sort: Most absent" })).toBeTruthy();

    renderAt("/admin/company/attendance?sort=az");
    const monthAz = await card("Attendance this month");
    expect(
      within(monthAz)
        .getAllByText(/^(Priya Nair|Amit Sharma|Divya Bhat)$/)
        .map((n) => n.textContent),
    ).toEqual(["Amit Sharma", "Divya Bhat", "Priya Nair"]);
    expect(screen.getByRole("button", { name: "Sort: Name A–Z" })).toBeTruthy();
  });
});

describe("AdminAttendancePage: the pager over a wide roster", () => {
  /** Twelve same-shaped employees — enough to fill two pages of ten. */
  function wideRoster(): void {
    setRespond((url) => {
      if (url.includes("/attendance/monthly")) {
        return jsonResponse({
          from: "2026-11-01",
          to: "2026-11-14",
          employees: Array.from({ length: 12 }, (_, i) => ({
            employeeId: `u-${i + 1}`,
            employeeName: `Employee ${String(i + 1).padStart(2, "0")}`,
            officeName: "Andheri",
            summary: {
              daysWorked: 10,
              halfDays: 0,
              lateCount: 0,
              leave: 0,
              weeklyOffs: 2,
              holidays: 1,
              workedOnHoliday: 0,
              absent: 0,
              checkoutMissing: 0,
            },
          })),
        });
      }
      return respondDefault(url);
    });
  }

  it("says what is showing and pages a roster wider than one page", async () => {
    wideRoster();
    renderAttendance();
    await card("Attendance this month");
    expect(screen.getByText(/Showing 1–10 of 12 employees/)).toBeTruthy();
    expect(screen.getByText("Employee 01")).toBeTruthy();
    expect(screen.queryByText("Employee 12")).toBeNull();
    fireEvent.click(screen.getByLabelText("Next page"));
    await waitFor(() => {
      expect(screen.getByText(/Showing 11–12 of 12 employees/)).toBeTruthy();
    });
    expect(screen.getByText("Employee 12")).toBeTruthy();
    expect(screen.queryByText("Employee 01")).toBeNull();
    // Page 2 of 2: the walk ran out, so no further step is offered.
    expect(screen.queryByLabelText("Next page")).toBeNull();
    expect(screen.getByLabelText("Previous page")).toBeTruthy();
  });

  it("the go-to form rejects a page outside the range, then jumps", async () => {
    wideRoster();
    renderAttendance("/admin/company/attendance?page=2");
    await card("Attendance this month");
    const input = screen.getByLabelText("Go to page");
    fireEvent.change(input, { target: { value: "9" } });
    fireEvent.submit(input.closest("form")!);
    expect(screen.getByText("Enter a page from 1 to 2.")).toBeTruthy();
    fireEvent.change(input, { target: { value: "1" } });
    fireEvent.submit(input.closest("form")!);
    await waitFor(() => {
      expect(screen.getByText(/Showing 1–10 of 12 employees/)).toBeTruthy();
    });
  });

  it("a filtered view with zero matches keeps the pager", async () => {
    wideRoster();
    renderAttendance("/admin/company/attendance?office=Nowhere&page=5");
    await card("Attendance this month");
    expect(screen.getByText(/No employees match these filters/)).toBeTruthy();
    expect(screen.getByLabelText("Pages")).toBeTruthy();
  });
});

describe("AdminAttendancePage: only owners get in", () => {
  it("bounces a member back to the console index", async () => {
    setRespond((url) => {
      if (url.endsWith("/users/me")) {
        return jsonResponse({
          id: "u-emp",
          role: "employee",
          name: "Priya Nair",
          platformAdmin: false,
          canCreateJobs: true,
          jobApprovalRequired: true,
        });
      }
      return respondDefault(url);
    });
    writeSession({ token: "tok-1", name: "Priya" });
    const router = createMemoryRouter(routes, { initialEntries: ["/admin/company/attendance"] });
    render(<RouterProvider router={router} />);
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/admin");
    });
  });
});

describe("AdminAttendancePage: revalidation follows the address", () => {
  it("a tab change refetches only the new tab's endpoint and swaps the panel", async () => {
    renderAttendance();
    await card("Attendance this month");
    expect(sentRequests().some((r) => r.url.includes("/reports?limit="))).toBe(false);
    fireEvent.click(screen.getByRole("link", { name: "Report" }));
    await waitFor(() => {
      expect(sentRequests().some((r) => r.url.includes("/reports?limit="))).toBe(true);
    });
    await card("Attendance report");
    // The month table is gone — and the expensive monthly endpoint did not
    // rerun for the tab change (the clause's true path).
    expect(screen.queryByText("Priya Nair")).toBeNull();
    expect(sentRequests().filter((r) => r.url.includes("/attendance/monthly")).length).toBe(1);
  });

  it("Try again on a failed month re-issues the monthly request and recovers", async () => {
    monthlyFails = true;
    renderAttendance();
    expect(await screen.findByText(/This page could not load/)).toBeInTheDocument();
    monthlyFails = false;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => {
      expect(sentRequests().filter((r) => r.url.includes("/attendance/monthly")).length).toBe(2);
    });
    await card("Attendance this month");
    expect(screen.getByText("Priya Nair")).toBeTruthy();
  });
});

describe("AdminAttendancePage: the export carries the whole book", () => {
  it("Export CSV keeps every employee even while a chip trims the table", async () => {
    const saved: Blob[] = [];
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    const originalClick = HTMLAnchorElement.prototype.click;
    URL.createObjectURL = ((blob: Blob) => {
      saved.push(blob);
      return "blob:stub";
    }) as typeof URL.createObjectURL;
    URL.revokeObjectURL = (() => {}) as typeof URL.revokeObjectURL;
    HTMLAnchorElement.prototype.click = function click() {};
    try {
      renderAttendance("/admin/company/attendance?chip=absent");
      await card("Attendance this month");
      // Amit (0 absent days) is trimmed off the screen…
      expect(screen.queryByText("Amit Sharma")).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));
      await waitFor(() => expect(saved.length).toBe(1));
      const text = await saved[0].text();
      // …but the file keeps everyone: the filter lives in the address, the
      // book in the payload.
      expect(text).toContain('"Priya Nair"');
      expect(text).toContain('"Amit Sharma"');
      expect(text).toContain('"Divya Bhat"');
    } finally {
      URL.createObjectURL = originalCreate;
      URL.revokeObjectURL = originalRevoke;
      HTMLAnchorElement.prototype.click = originalClick;
    }
  });
});

/** A second render in one test must clean up the first — the helper keeps the
 *  navigation entry honest for follow-up renders. */
function renderAt(path: string): void {
  cleanup();
  renderAttendance(path);
}
