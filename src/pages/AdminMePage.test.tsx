import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { routes } from "../app/routes";
import { writeSession } from "../services/session";
import {
  clearApiBase,
  installFetchMock,
  jsonResponse,
  restoreFetchMock,
  setRespond,
  useApiBase,
} from "../testing/fetchMock";

// The employee's Me section after the job panels moved to the shared jobs
// page: Me keeps the profile, the attendance facts, the month summary and
// leave — and shows no job card at all, even the "My jobs" table. Every
// endpoint answers by URL, statelessly.

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
      canCreateJobs: true,
      jobApprovalRequired: true,
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

function page(data: unknown[], hasMore = false): Response {
  return jsonResponse({ data, nextCursor: hasMore ? "c-next" : null, hasMore });
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

describe("AdminMePage: what stays on Me after the job panels moved", () => {
  it("renders the profile, the attendance facts, the month and my leave", async () => {
    writeSession({ token: "tok-1", name: "Priya" });
    renderMe();
    await card("Attendance");
    // The name shows on the identity card (the sidebar chip repeats it).
    expect(screen.getAllByText("Priya Nair").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("This month")).toBeInTheDocument();
    await card("My leave");
    expect(screen.getAllByText("No leave requests.").length).toBe(1);
  });

  it("shows no job panel at all — they live on the Jobs tab now", async () => {
    writeSession({ token: "tok-1", name: "Priya" });
    renderMe();
    await card("My leave");
    expect(screen.queryByText("New job")).toBeNull();
    expect(screen.queryByText("Waiting for approval")).toBeNull();
    expect(screen.queryByText("My job activity")).toBeNull();
    expect(screen.queryByText("My rejected jobs")).toBeNull();
    expect(screen.queryByText("My jobs")).toBeNull();
  });

  it("degrades per card, not to a blank screen, when the endpoints fail", async () => {
    // The layout's /users/me keeps working so the section itself mounts;
    // every slice fails on its own and the attendance card shows its alert.
    setRespond((url) => (url.endsWith("/users/me") ? respondDefault(url) : jsonResponse({}, 500)));
    writeSession({ token: "tok-1", name: "Priya" });
    renderMe();
    expect(
      await screen.findByText(/Attendance could not load — it may not be enabled for you yet/),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Priya Nair").length).toBeGreaterThanOrEqual(1);
  });
});
