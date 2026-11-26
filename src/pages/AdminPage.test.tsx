import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { routes } from "../app/routes";
import { AdminChecking } from "./AdminPage";
import { consoleRole, sectionGroupsFor, sectionsFor } from "../features/admin/adminLoader";
import { SESSION_KEY, writeSession } from "../services/session";
import { resetLeaveSummaryCacheForTests } from "../features/admin/leaveSummaryCache";
import { resetIdentityCacheForTests } from "../features/admin/identityCache";
import { clearApiBase, jsonResponse, useApiBase } from "../testing/fetchMock";

let meAnswers: Array<() => Response> = [];
let meCalls = 0;
// The sidebar badge's summary read — unset means "offline" (the badge
// degrades away, like a backend without the endpoint).
let summaryAnswer: (() => Response) | undefined;
const originalFetch = globalThis.fetch;

beforeAll(() => {
  useApiBase();
});

afterAll(() => {
  clearApiBase();
});

beforeEach(() => {
  meAnswers = [];
  meCalls = 0;
  summaryAnswer = undefined;
  // The shared summary cache is module state — one test's answer must never
  // serve the next test's badge. The identity cache is the same shape.
  resetLeaveSummaryCacheForTests();
  resetIdentityCacheForTests();
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/users/me")) {
      meCalls += 1;
      const next = meAnswers.shift();
      // Unqueued calls (a revalidation from a previous test that fired late)
      // get a harmless default, so they cannot poison this test's answers.
      return next === undefined
        ? jsonResponse({
            id: "late",
            role: null,
            name: null,
            platformAdmin: false,
            email: null,
            countryCode: "+91",
            phoneNumber: "9000000000",
            employeeCode: null,
            status: null,
          })
        : next();
    }
    if (url.endsWith("/attendance/leave/summary")) {
      const next = summaryAnswer;
      if (next === undefined) throw new TypeError(`offline in tests: ${url}`);
      return next();
    }
    // Anything else (section endpoints, the home page's country codes) fails,
    // like router tests do.
    throw new TypeError(`offline in tests: ${url}`);
  }) as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  window.localStorage.clear();
  cleanup();
});

function me(
  overrides: Partial<{
    id: string;
    role: string | null;
    name: string | null;
    platformAdmin: boolean;
  }> = {},
): () => Response {
  return () =>
    jsonResponse({
      id: "11111111-1111-4111-8111-111111111111",
      role: "company_admin",
      name: "Ravi Kumar",
      platformAdmin: false,
      ...overrides,
    });
}

function renderAdmin(initialEntry = "/admin"): void {
  const router = createMemoryRouter(routes, { initialEntries: [initialEntry] });
  render(<RouterProvider router={router} />);
}

function meObject(
  overrides: Partial<{ id: string; role: string | null; platformAdmin: boolean }> = {},
): {
  id: string;
  name: string | null;
  role: string | null;
  platformAdmin: boolean;
  email: string | null;
  countryCode: string;
  phoneNumber: string;
  employeeCode: string | null;
  status: string | null;
} {
  return {
    id: "u",
    name: null,
    role: null,
    platformAdmin: false,
    email: null,
    countryCode: "+91",
    phoneNumber: "9876543210",
    employeeCode: null,
    status: null,
    ...overrides,
  };
}

describe("consoleRole", () => {
  it("makes a platform admin staff", () => {
    expect(consoleRole(meObject({ platformAdmin: true }))).toBe("staff");
  });

  it("makes a company admin an owner", () => {
    expect(consoleRole(meObject({ role: "company_admin" }))).toBe("owner");
  });

  it.each([["employee"], ["viewer"], [null]] as const)("makes %s a plain member", (role) => {
    expect(consoleRole(meObject({ role }))).toBe("member");
  });
});

describe("sectionsFor", () => {
  it("gives staff Inspect Person, Account Details, Reports, Delete Requests and App Settings, in that order", () => {
    expect(sectionsFor("staff").map((s) => s.to)).toEqual([
      "/admin/inspect",
      "/admin/account",
      "/admin/reports",
      "/admin/deletion-requests",
      "/admin/config",
    ]);
  });

  it("gives an owner the overview and the browse lists — the dashboard merged into Overview", () => {
    expect(sectionsFor("owner").map((s) => s.to)).toEqual([
      "/admin/company",
      "/admin/company/customers",
      "/admin/company/employees",
      "/admin/company/payroll",
      "/admin/company/jobs",
      "/admin/company/holidays",
      "/admin/company/leave",
      "/admin/company/attendance",
    ]);
  });

  it("gives a member My Details and the shared Jobs page", () => {
    expect(sectionsFor("member").map((s) => s.to)).toEqual(["/admin/me", "/admin/company/jobs"]);
  });
});

describe("sectionGroupsFor", () => {
  it("clusters the owner sections under Business, Team and Money, with Overview standing alone", () => {
    expect(sectionGroupsFor("owner")).toEqual([
      { caption: null, links: [{ to: "/admin/company", label: "Overview" }] },
      {
        caption: "Business",
        links: [
          { to: "/admin/company/customers", label: "Customers" },
          { to: "/admin/company/jobs", label: "Jobs" },
        ],
      },
      {
        caption: "Team",
        links: [
          { to: "/admin/company/employees", label: "Employees" },
          { to: "/admin/company/leave", label: "Leave" },
          { to: "/admin/company/attendance", label: "Attendance" },
          { to: "/admin/company/holidays", label: "Holidays" },
        ],
      },
      { caption: "Money", links: [{ to: "/admin/company/payroll", label: "Salary" }] },
    ]);
  });

  it("keeps the short staff and member lists as one uncaptioned group", () => {
    expect(sectionGroupsFor("staff")).toEqual([{ caption: null, links: sectionsFor("staff") }]);
    expect(sectionGroupsFor("member")).toEqual([{ caption: null, links: sectionsFor("member") }]);
  });

  it("places every owner section exactly once across the groups — a pick list can never drop one", () => {
    const grouped = sectionGroupsFor("owner")
      .flatMap((group) => group.links.map((link) => link.to))
      .sort();
    expect(grouped).toEqual(
      sectionsFor("owner")
        .map((section) => section.to)
        .sort(),
    );
  });
});

describe("Console: access", () => {
  it("sends a visitor with no saved sign-in to /login without asking the backend", async () => {
    renderAdmin();

    expect(await screen.findByRole("heading", { name: "Log in to Fenzit" })).toBeInTheDocument();
    // The session check comes first: no /users/me probe leaves the browser.
    expect(meCalls).toBe(0);
  });

  it("clears a dead sign-in and sends the person to /login on a 401", async () => {
    writeSession({ token: "expired", name: "Ravi" });
    meAnswers.push(() => jsonResponse({ error_code: "UNAUTHORIZED", message: "x" }, 401));

    renderAdmin();

    expect(await screen.findByRole("heading", { name: "Log in to Fenzit" })).toBeInTheDocument();
    expect(window.localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it("treats a 403 the same way, so a removed member is signed out", async () => {
    writeSession({ token: "removed", name: "Ravi" });
    meAnswers.push(() => jsonResponse({ error_code: "FORBIDDEN", message: "x" }, 403));

    renderAdmin();

    expect(await screen.findByRole("heading", { name: "Log in to Fenzit" })).toBeInTheDocument();
    expect(window.localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it("shows the retry state, not a redirect, when the check fails for another reason", async () => {
    writeSession({ token: "tok-1", name: null });
    meAnswers.push(() => {
      throw new TypeError("network down");
    });

    renderAdmin();

    expect(
      await screen.findByText(
        "We could not check your access. Please check your internet connection and try again.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try Again" })).toBeInTheDocument();
    // The sign-in is kept: a connection failure is not a signed-out state.
    expect(window.localStorage.getItem(SESSION_KEY)).not.toBeNull();
  });

  it("recovers on Try Again without a fresh sign-in", async () => {
    writeSession({ token: "tok-1", name: null });
    meAnswers.push(() => {
      throw new TypeError("network down");
    });
    // After the check passes, the owner is redirected to the merged Overview,
    // whose loader asks who the person is once more.
    meAnswers.push(me(), me());

    renderAdmin();
    fireEvent.click(await screen.findByRole("button", { name: "Try Again" }));

    // The greeting now comes from the merged Overview's own header — waited
    // on the Owner pill, which only that page renders.
    expect(await screen.findByText("Owner")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Hello, Ravi Kumar");
  });
});

describe("Console: who sees what", () => {
  it("sends a company owner straight to the merged Overview, with no Dashboard link", async () => {
    writeSession({ token: "tok-1", name: "Ravi Kumar" });
    // The layout's check, then the overview loader's own.
    meAnswers.push(me(), me());

    renderAdmin();

    // The redirect lands on /admin/company, which draws its own header —
    // awaited on the Owner pill, which only that page renders.
    expect(await screen.findByText("Owner")).toBeInTheDocument();
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent("Hello, Ravi Kumar");
    expect(screen.getByLabelText("Breadcrumb").textContent).toBe("Console›Overview");
    // The role lives in the sidebar user chip.
    expect(screen.getByText("Company Owner")).toBeInTheDocument();
    // The dashboard merged into Overview: its failing slices degrade to
    // their own retry lines (this test's fetch mock is offline).
    expect(
      await screen.findByText("The report could not load for this period."),
    ).toBeInTheDocument();
    expect(screen.getByText("The pulse could not load.")).toBeInTheDocument();
    // The sidebar: one Overview section, no separate Dashboard.
    expect(screen.queryByRole("link", { name: "Dashboard" })).toBeNull();
    expect(screen.getByRole("link", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Customers" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Employees" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Jobs" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Holidays" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Attendance" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Inspect Person" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Account Details" })).toBeNull();
    expect(screen.queryByRole("link", { name: "My Details" })).toBeNull();
  });

  it("gives a platform admin the staff sections, greeting a nameless account as Hello", async () => {
    writeSession({ token: "tok-1", name: null });
    meAnswers.push(me({ role: null, platformAdmin: true, name: null }));

    renderAdmin();

    expect(await screen.findByRole("heading", { name: "Hello" })).toBeInTheDocument();
    expect(screen.getByText("Fenzit Staff")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Inspect Person" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Account Details" })).toBeInTheDocument();
    // The landing index: whole-row links with their plain-English blurbs, and
    // the safety line that says what this console cannot do.
    expect(
      screen.getByRole("link", { name: /View all details about a person/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("You cannot delete anything from this page.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Company" })).toBeNull();
    expect(screen.queryByRole("link", { name: "My Details" })).toBeNull();
  });

  it("shows the role alone in the sidebar chip when the name is blank or only spaces", async () => {
    writeSession({ token: "tok-1", name: "   " });
    meAnswers.push(me({ role: null, platformAdmin: true, name: "   " }));

    renderAdmin();

    expect(await screen.findByRole("link", { name: "Inspect Person" })).toBeInTheDocument();
    expect(screen.getByText("Fenzit Staff").parentElement?.textContent).toBe("Fenzit Staff");
  });

  it("points each staff index row at its own section", async () => {
    writeSession({ token: "tok-1", name: "Ravi Kumar" });
    meAnswers.push(me({ role: null, platformAdmin: true }));

    renderAdmin();

    const inspect = await screen.findByRole("link", {
      name: /View all details about a person/,
    });
    expect(inspect).toHaveAttribute("href", "/admin/inspect");
    expect(
      screen.getByRole("link", { name: /Manage app updates and support contact/ }),
    ).toHaveAttribute("href", "/admin/config");
  });

  it("gives an employee only the Me section — the console no longer refuses them", async () => {
    writeSession({ token: "tok-1", name: "Ravi" });
    meAnswers.push(me({ role: "employee" }));

    renderAdmin();

    expect(await screen.findByRole("heading", { name: "Hello, Ravi Kumar" })).toBeInTheDocument();
    expect(screen.getByText("Team Member")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "My Details" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Company" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Inspect Person" })).toBeNull();
  });
});

describe("Console: the sidebar's captions and the Leave badge", () => {
  it("renders the owner captions and carries the pending count on the Leave row", async () => {
    writeSession({ token: "tok-1", name: "Ravi Kumar" });
    // The layout's check, then the overview loader's own.
    meAnswers.push(me(), me());
    summaryAnswer = () =>
      jsonResponse({
        activeEmployees: 10,
        counts: { pending: 3, approved: 1, revoked: 0, cancelled: 0, rejected: 0 },
      });

    renderAdmin();

    // The badge renames the link for AT and shows the count on the row —
    // the design's chip on the active Leave pill.
    const leave = await screen.findByRole("link", { name: "Leave – 3 requests waiting" });
    expect(leave).toHaveTextContent("3");
    // The design's group captions over their clusters…
    expect(screen.getByText("Business")).toBeInTheDocument();
    expect(screen.getByText("Team")).toBeInTheDocument();
    expect(screen.getByText("Money")).toBeInTheDocument();
    // …and Overview standing alone, with no caption paragraph over it.
    expect(screen.queryByText("Overview", { selector: "p" })).toBeNull();
  });

  it("answers a summary without counts with a plain Leave link, no badge", async () => {
    writeSession({ token: "tok-1", name: "Ravi Kumar" });
    meAnswers.push(me(), me());
    // An older backend answers without `counts` — the badge degrades away.
    summaryAnswer = () => jsonResponse({ activeEmployees: 10 });

    renderAdmin();

    expect(await screen.findByRole("link", { name: "Leave" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /requests waiting/ })).toBeNull();
  });

  it("answers a zero pending count with a plain Leave link — zero is no news", async () => {
    writeSession({ token: "tok-1", name: "Ravi Kumar" });
    meAnswers.push(me(), me());
    summaryAnswer = () =>
      jsonResponse({
        activeEmployees: 10,
        counts: { pending: 0, approved: 1, revoked: 0, cancelled: 0, rejected: 0 },
      });

    renderAdmin();

    expect(await screen.findByRole("link", { name: "Leave" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /requests waiting/ })).toBeNull();
  });

  it("answers a failed summary read with a plain Leave link — the console still loads", async () => {
    writeSession({ token: "tok-1", name: "Ravi Kumar" });
    meAnswers.push(me(), me());
    // summaryAnswer stays unset: the read throws, like a dead network —
    // the layout degrades the badge away, it does not fail the console.
    renderAdmin();

    expect(await screen.findByText("Owner")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Leave" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /requests waiting/ })).toBeNull();
  });

  it("asks no summary read for staff — no Leave section, nothing to count", async () => {
    writeSession({ token: "tok-1", name: null });
    // The layout's check, then the inspect route's own role check.
    meAnswers.push(
      me({ role: null, platformAdmin: true, name: null }),
      me({ role: null, platformAdmin: true, name: null }),
    );
    let summaryCalls = 0;
    summaryAnswer = () => {
      summaryCalls += 1;
      return jsonResponse({ activeEmployees: 10 });
    };

    renderAdmin("/admin/inspect");

    expect(await screen.findByRole("link", { name: "Inspect Person" })).toBeInTheDocument();
    expect(summaryCalls).toBe(0);
  });
});

describe("Console: section gating", () => {
  it("bounces an employee who hand-types /admin/inspect back to their own console", async () => {
    writeSession({ token: "tok-1", name: "Ravi" });
    // The identity read is shared per burst (CAP-8): the layout loader and
    // the refused child loader both read the cached answer, so one wire
    // read serves the whole bounce.
    meAnswers.push(me({ role: "employee" }));

    renderAdmin("/admin/inspect");

    // The refusal lands on /admin, and the index forwards a member to Me —
    // the Me section itself is on screen, not a welcome card to click.
    expect(
      await screen.findByRole("heading", { name: "Ravi Kumar", level: 2 }),
    ).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("98765 43210")).toBeNull();
  });

  it("lands a staff visit to /admin/account on the search, idle", async () => {
    writeSession({ token: "tok-1", name: null });
    meAnswers.push(me({ role: null, platformAdmin: true, name: null }));
    meAnswers.push(me({ role: null, platformAdmin: true, name: null }));

    renderAdmin("/admin/account");

    expect(
      await screen.findByText(/Search for a phone number to see that person's access/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Change what a person can do", level: 2 }),
    ).toBeInTheDocument();
    for (const action of [
      "Make someone staff",
      "Stop an account from signing in",
      "Let an account sign in again",
      "Remove someone from staff",
    ]) {
      expect(screen.getByText(action, { selector: "li" })).toBeInTheDocument();
    }
  });
});

describe("Console: logging out", () => {
  it("clears the saved sign-in and lands on the login page", async () => {
    writeSession({ token: "tok-1", name: "Ravi" });
    // The layout's check, then the overview loader the owner is redirected to.
    meAnswers.push(me(), me());

    renderAdmin();
    fireEvent.click(await screen.findByRole("button", { name: "Log Out" }));

    expect(
      await screen.findByRole("heading", { level: 1, name: /log in to fenzit/i }),
    ).toBeInTheDocument();
    expect(window.localStorage.getItem(SESSION_KEY)).toBeNull();
  });
});

describe("AdminChecking", () => {
  it("says the access check is running, in plain text", () => {
    render(<AdminChecking />);

    expect(screen.getByText("Checking your access…")).toBeInTheDocument();
    cleanup();
  });
});

describe("Console: the sidebar's active link on a section page", () => {
  it("lights Jobs on the jobs page, and never Overview on a sub-page", async () => {
    writeSession({ token: "tok-1", name: "Ravi" });
    // Two /users/me calls: the layout's check, then the jobs loader's.
    meAnswers.push(me(), me());
    renderAdmin("/admin/company/jobs");
    const sidebar = await screen.findByRole("navigation", { name: "Console Menu" });
    expect(within(sidebar).getByRole("link", { name: "Jobs" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    // Overview owns its address exactly: a sub-page must not keep it lit.
    const overview = within(sidebar).getByRole("link", { name: "Overview" });
    expect(overview.getAttribute("aria-current")).toBeNull();
  });
});
