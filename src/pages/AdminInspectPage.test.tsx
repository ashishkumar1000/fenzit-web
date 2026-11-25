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

// The staff Inspect page: the exact-phone lookup renders the dossier under
// the console shell. The GPS badge is the load-bearing column — a check-in
// the backend flagged mocked reads "Test Location", a real one "Verified" —
// beside the glanceable totals, the No Name fallback, and the subscription
// date the staff member can set for the picked company.

beforeAll(() => {
  useApiBase();
});

afterAll(() => {
  clearApiBase();
});

const COMPANY_ID = "9be0c7d0-1a2b-4c3d-8e4f-5a6b7c8d9e0f";

beforeEach(() => {
  installFetchMock();
  setRespond(respondDefault);
});

function respondDefault(url: string): Response {
  if (url.endsWith("/users/me")) {
    return jsonResponse({
      id: "u-staff",
      role: null,
      name: "Gita Menon",
      platformAdmin: true,
      email: "gita@example.com",
      countryCode: "+91",
      phoneNumber: "9100000001",
      employeeCode: null,
      status: "active",
    });
  }
  if (url.includes("/admin/users/lookup")) return jsonResponse(dossier());
  // The dial-code select: an empty list degrades to the India fallback.
  if (url.includes("/country-codes")) return jsonResponse([]);
  // The subscription save answers plain 200.
  if (url.endsWith("/validity")) return jsonResponse({});
  throw new TypeError(`offline in tests: ${url}`);
}

function attendanceRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    workDate: "2026-11-20",
    checkin: "2026-11-20T02:05:00Z",
    checkout: "2026-11-20T06:10:00Z",
    checkinDistance: 140,
    checkoutDistance: 90,
    mocked: false,
    ...overrides,
  };
}

function dossier(): Record<string, unknown> {
  return {
    user: {
      id: "u-1",
      name: null,
      countryCode: "+91",
      phoneNumber: "9876543210",
      email: null,
      platformAdmin: false,
      disabled: false,
      createdAt: "2026-01-05T04:30:00Z",
      lastSignInAt: null,
      authCreatedAt: null,
    },
    counts: {
      jobs: 2,
      skills: 1,
      auditRows: 0,
      membershipsAll: 1,
      notifications: 1,
      attendanceRecords: 2,
      attendanceAttempts: 0,
      leaveRequests: 0,
      reports: 0,
      activityRows: 0,
      invitesSent: 0,
    },
    memberships: [
      {
        companyId: COMPANY_ID,
        company: "Fenzit Services",
        role: "company_admin",
        status: "active",
        employeeCode: null,
        invitedBy: null,
        joined: "2026-01-05T04:30:00Z",
        isFounder: false,
        validityUntil: null,
      },
    ],
    offices: [],
    jobs: [],
    attendance: {
      recent: [
        attendanceRow({ mocked: true, checkinDistance: 12000, checkoutDistance: 12000 }),
        attendanceRow({ workDate: "2026-11-19" }),
      ],
      attempts: [],
      records: 2,
      attemptsCount: 0,
      corrections: 0,
      overrides: 0,
      overridesAuthored: 0,
      weeklyOff: 0,
      enrolments: 0,
    },
    leave: [],
    leaveDays: [],
    leaveEvents: [],
    skills: ["AC Service"],
    invites: { sent: [], invitedBy: null },
    authored: { corrections: [] },
    notifications: [],
    audit: [],
    activity: [],
    reports: [],
    company: null,
  };
}

afterEach(() => {
  restoreFetchMock();
  window.localStorage.clear();
  window.sessionStorage.clear();
  cleanup();
});

function renderInspect(entry = `/admin/inspect?number=9876543210&company=${COMPANY_ID}`): void {
  const router = createMemoryRouter(routes, { initialEntries: [entry] });
  render(<RouterProvider router={router} />);
}

/** One stat tile, found by its label paragraph — the same words can also
 *  name a section card's heading, so the <p> is the tile's. */
function dossierTile(label: string): HTMLElement {
  const labelP = screen.getAllByText(label).find((el) => el.tagName === "P");
  if (labelP === undefined) throw new Error(`no tile labelled ${label}`);
  return labelP.closest("div")!;
}

describe("AdminInspectPage: the dossier under the console shell", () => {
  it("the attendance table's GPS badge says Test Location for a mocked row, Verified for a real one", async () => {
    writeSession({ token: "tok-1", name: "Gita" });
    renderInspect();
    expect(await screen.findByText("Attendance")).toBeTruthy();
    const table = screen.getByText("GPS Status").closest("table");
    if (table === null) throw new Error("no attendance table");
    expect(within(table).getByText("Test Location")).toBeTruthy();
    expect(within(table).getByText("Verified")).toBeTruthy();
  });

  it("the tiles carry the glanceable totals and an unnamed person reads No Name", async () => {
    writeSession({ token: "tok-1", name: "Gita" });
    renderInspect();
    expect(await screen.findByText("No Name")).toBeTruthy();
    for (const [label, value] of [
      ["Jobs", "2"],
      ["Attendance Records", "2"],
      ["Check-in Attempts", "0"],
      ["Leave Requests", "0"],
      ["Invitations Sent", "0"],
      ["Notifications", "1"],
      ["Change History", "0"],
      ["Recent Activity", "0"],
    ] as const) {
      expect(within(dossierTile(label)).getByText(value)).toBeTruthy();
    }
  });

  it("the picked company's subscription shows No Expiry Date and saving one says Saved Successfully.", async () => {
    writeSession({ token: "tok-1", name: "Gita" });
    renderInspect();
    expect(await screen.findByText("You are currently managing Fenzit Services.")).toBeTruthy();
    expect(screen.getByText("No Expiry Date")).toBeTruthy();
    const input = screen.getByLabelText("Subscription End Date (India Time)") as HTMLInputElement;
    expect(input.value).toBe("");
    fireEvent.change(input, { target: { value: "2026-12-31" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Date" }));
    await waitFor(() => {
      const put = sentRequests().find((r) => r.method === "PUT" && r.url.endsWith("/validity"));
      expect(put).toBeTruthy();
      expect(put!.body).toEqual({ validUntil: "2026-12-31T23:59:59+05:30" });
    });
    expect(await screen.findByText("Saved Successfully.")).toBeTruthy();
  });
});
