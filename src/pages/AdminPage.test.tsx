import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { routes } from "../app/routes";
import { AdminChecking } from "./AdminPage";
import { canOpenAdmin } from "../features/admin/adminLoader";
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
      if (next === undefined) throw new TypeError("no /users/me answer queued in this test");
      return next();
    }
    // Anything else (such as the home page's country codes) fails, like router tests do.
    throw new TypeError(`offline in tests: ${url}`);
  }) as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  window.localStorage.clear();
  cleanup();
});

function me(
  overrides: Partial<{ role: string | null; name: string | null; platformAdmin: boolean }> = {},
): () => Response {
  return () =>
    jsonResponse({ role: "company_admin", name: "Ravi Kumar", platformAdmin: false, ...overrides });
}

function renderAdmin(): void {
  const router = createMemoryRouter(routes, { initialEntries: ["/admin"] });
  render(<RouterProvider router={router} />);
}

describe("canOpenAdmin", () => {
  it("lets a company admin in", () => {
    expect(canOpenAdmin("company_admin", false)).toBe(true);
  });

  it("lets a platform admin in, even with no membership role", () => {
    expect(canOpenAdmin(null, true)).toBe(true);
  });

  it.each([
    ["employee", false, "an employee"],
    ["viewer", false, "a viewer"],
    [null, false, "a person with no membership"],
    ["owner", false, "a stale owner role from before the rename"],
  ])("refuses %s (%s)", (role, platformAdmin) => {
    expect(canOpenAdmin(role, platformAdmin)).toBe(false);
  });
});

describe("AdminPage: access", () => {
  it("sends a visitor with no saved sign-in to /login without asking the backend", async () => {
    renderAdmin();

    expect(await screen.findByRole("heading", { name: "Log in to Fenzit" })).toBeInTheDocument();
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

    expect(await screen.findByRole("heading", { name: "Company admin" })).toBeInTheDocument();
  });
});

describe("AdminPage: who gets in", () => {
  it("welcomes a company admin by name", async () => {
    writeSession({ token: "tok-1", name: "Ravi Kumar" });
    meAnswers.push(me());

    renderAdmin();

    expect(await screen.findByRole("heading", { name: "Company admin" })).toBeInTheDocument();
    expect(
      screen.getByText("This page is a placeholder. Company tools will appear here."),
    ).toBeInTheDocument();
    expect(screen.getByText("Signed in as Ravi Kumar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
  });

  it("lets a platform admin in and skips the name line when the account has none", async () => {
    writeSession({ token: "tok-1", name: null });
    meAnswers.push(me({ role: null, platformAdmin: true, name: null }));

    renderAdmin();

    expect(await screen.findByRole("heading", { name: "Company admin" })).toBeInTheDocument();
    expect(screen.queryByText(/Signed in as/)).toBeNull();
  });

  it.each([
    [me({ role: "employee" }), "an employee"],
    [me({ role: "viewer" }), "a viewer"],
    [me({ role: null, platformAdmin: false }), "a person with no membership"],
  ])("shows the no-permission message to %s", async (answer) => {
    writeSession({ token: "tok-1", name: "Ravi" });
    meAnswers.push(answer);

    renderAdmin();

    expect(
      await screen.findByText("You do not have permission to open this page."),
    ).toBeInTheDocument();
    // The heading stays (the UX pass keeps it); the refused content and the
    // placeholder line are what disappear.
    expect(
      screen.queryByText("This page is a placeholder. Company tools will appear here."),
    ).toBeNull();
    expect(screen.queryByText(/Signed in as/)).toBeNull();
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
  });
});

describe("AdminPage: logging out", () => {
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
    await waitFor(() => expect(window.localStorage.getItem(SESSION_KEY)).toBeNull());
  });

  it("offers the same log out to a person refused permission", async () => {
    writeSession({ token: "tok-1", name: "Ravi" });
    meAnswers.push(me({ role: "employee" }));

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
