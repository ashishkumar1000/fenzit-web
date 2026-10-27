import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { routes } from "../app/routes";
import { AdminChecking } from "./AdminPage";
import { consoleRole, sectionsFor } from "../features/admin/adminLoader";
import { SESSION_KEY, writeSession } from "../services/session";
import { clearApiBase, jsonResponse, useApiBase } from "../testing/fetchMock";

let meAnswers: Array<() => Response> = [];
let meCalls = 0;
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
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/users/me")) {
      meCalls += 1;
      const next = meAnswers.shift();
      // Unqueued calls (a revalidation from a previous test that fired late)
      // get a harmless default, so they cannot poison this test's answers.
      return next === undefined
        ? jsonResponse({ id: "late", role: null, name: null, platformAdmin: false })
        : next();
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
  it("gives staff Inspect and Account", () => {
    expect(sectionsFor("staff").map((s) => s.to)).toEqual(["/admin/inspect", "/admin/account"]);
  });

  it("gives an owner only Company", () => {
    expect(sectionsFor("owner").map((s) => s.to)).toEqual(["/admin/company"]);
  });

  it("gives a member only Me", () => {
    expect(sectionsFor("member").map((s) => s.to)).toEqual(["/admin/me"]);
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
        "We could not check your access. Check your connection and try again.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    // The sign-in is kept: a connection failure is not a signed-out state.
    expect(window.localStorage.getItem(SESSION_KEY)).not.toBeNull();
  });

  it("recovers on Try again without a fresh sign-in", async () => {
    writeSession({ token: "tok-1", name: null });
    meAnswers.push(() => {
      throw new TypeError("network down");
    });
    meAnswers.push(me());

    renderAdmin();
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("heading", { name: "Hello, Ravi Kumar" })).toBeInTheDocument();
  });
});

describe("Console: who sees what", () => {
  it("welcomes a company owner and shows only the Company section", async () => {
    writeSession({ token: "tok-1", name: "Ravi Kumar" });
    meAnswers.push(me());

    renderAdmin();

    expect(await screen.findByRole("heading", { name: "Hello, Ravi Kumar" })).toBeInTheDocument();
    expect(screen.getByText("Signed in as company owner")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Company" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Inspect" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Account" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Me" })).toBeNull();
  });

  it("gives a platform admin the staff sections, greeting a nameless account as Hello", async () => {
    writeSession({ token: "tok-1", name: null });
    meAnswers.push(me({ role: null, platformAdmin: true, name: null }));

    renderAdmin();

    expect(await screen.findByRole("heading", { name: "Hello" })).toBeInTheDocument();
    expect(screen.getByText("Signed in as fenzit staff")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Inspect" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Account" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Company" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Me" })).toBeNull();
  });

  it("gives an employee only the Me section — the console no longer refuses them", async () => {
    writeSession({ token: "tok-1", name: "Ravi" });
    meAnswers.push(me({ role: "employee" }));

    renderAdmin();

    expect(await screen.findByRole("heading", { name: "Hello, Ravi Kumar" })).toBeInTheDocument();
    expect(screen.getByText("Signed in as team member")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Me" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Company" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Inspect" })).toBeNull();
  });
});

describe("Console: section gating", () => {
  it("bounces an employee who hand-types /admin/inspect back to their own console", async () => {
    writeSession({ token: "tok-1", name: "Ravi" });
    // The layout loader and the refused child loader each ask who the person is.
    meAnswers.push(me({ role: "employee" }));
    meAnswers.push(me({ role: "employee" }));

    renderAdmin("/admin/inspect");

    expect(await screen.findByText(/The Me section shows your attendance/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("98765 43210")).toBeNull();
  });

  it("lands a staff visit to /admin/account on the search, idle", async () => {
    writeSession({ token: "tok-1", name: null });
    meAnswers.push(me({ role: null, platformAdmin: true, name: null }));
    meAnswers.push(me({ role: null, platformAdmin: true, name: null }));

    renderAdmin("/admin/account");

    expect(
      await screen.findByText(/Search a phone number to see that person's flags/i),
    ).toBeInTheDocument();
  });
});

describe("Console: logging out", () => {
  it("clears the saved sign-in and returns to the home page", async () => {
    writeSession({ token: "tok-1", name: "Ravi" });
    meAnswers.push(me());

    renderAdmin();
    fireEvent.click(await screen.findByRole("button", { name: "Log out" }));

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /run your jobs, attendance and leave/i,
      }),
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
