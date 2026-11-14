import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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

// The attendance page's two tabs (2026-11-14 restructure): the running
// month's table on the first tab, the attendance report PDF on the second —
// each tab fetching only its own data, a dead slice degrading to its own
// retry line, and a hand-typed address landing on the right tab.

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
    expect(within(month).getByText("Priya Nair")).toBeInTheDocument();
    expect(within(month).getByText("Andheri")).toBeInTheDocument();
    // The range in the meta is the server's answer, not a local guess.
    expect(within(month).getByText(/1 Nov .*– .*14 Nov/)).toBeInTheDocument();
    // Absence is the one graded status — it carries the status styling.
    expect(within(month).getByText("3")).toBeInTheDocument();
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
