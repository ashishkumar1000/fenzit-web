import { afterAll, afterEach, beforeAll, beforeEach } from "bun:test";
import { cleanup, render } from "@testing-library/react";
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
} from "./fetchMock";

// Shared fixtures for the Employees page tests: an honest fake of
// /members/page (it filters, sorts nothing, pages and counts like the API),
// the owner's session, and the router render. The API's search parameter is
// `search`; the address's `q` is mapped onto it by fetchMembersPage.

export type Row = ReturnType<typeof row>;

export function row(
  userId: string,
  name: string | null,
  role: string,
  status: string,
  canCreateJobs = false,
  jobApprovalRequired = false,
  email: string | null = null,
) {
  return {
    userId,
    name,
    email,
    countryCode: "+91",
    phoneNumber: "9800000000",
    employeeCode: `E-${userId}`,
    role,
    status,
    createdAt: "2026-01-01T00:00:00Z",
    canCreateJobs,
    jobApprovalRequired,
  };
}

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

/** The team the fake serves. Tests replace `team.rows` before rendering. */
export const team: { rows: Row[] } = { rows: [] };

function defaultRows(): Row[] {
  return [
    row("u-owner", "Ravi Kumar", "company_admin", "active"),
    row("u-a", "Asha V", "employee", "active", true, true),
    row("u-b", "Bunty R", "employee", "active"),
    row("u-c", "Chitra D", "employee", "active", true, false),
    row("u-v", "Vikas T", "viewer", "active"),
    row("u-m", "Meera Joshi", "employee", "invited"),
    row("u-d", "Dinesh P", "employee", "deactivated"),
  ];
}

function stats(rows: Row[]) {
  const count = (pred: (r: Row) => boolean) => rows.filter(pred).length;
  return {
    total: rows.length,
    active: count((r) => r.status === "active"),
    invited: count((r) => r.status === "invited"),
    deactivated: count((r) => r.status === "deactivated"),
    needsApproval: count((r) => r.status === "active" && r.canCreateJobs && r.jobApprovalRequired),
    byRole: {
      all: rows.length,
      company_admin: count((r) => r.role === "company_admin"),
      employee: count((r) => r.role === "employee"),
      viewer: count((r) => r.role === "viewer"),
    },
    byJobSetting: {
      all: rows.length,
      off: count((r) => !r.canCreateJobs),
      createOnly: count((r) => r.canCreateJobs && !r.jobApprovalRequired),
      approval: count((r) => r.canCreateJobs && r.jobApprovalRequired),
    },
  };
}

/** The honest fake: the page of the filtered list, with the same counts. */
export function pageOf(params: URLSearchParams, rows: Row[]) {
  const pageSize = Number(params.get("pageSize") ?? "10");
  const page = Number(params.get("page") ?? "1");
  const matched = rows.filter((r) => {
    const q = (params.get("search") ?? "").toLowerCase();
    if (q !== "" && !(r.name ?? "").toLowerCase().includes(q)) return false;
    const status = params.get("status");
    if (status !== null && status !== "all" && r.status !== status) return false;
    const role = params.get("role");
    if (role !== null && role !== "all" && r.role !== role) return false;
    return true;
  });
  const pages = Math.max(1, Math.ceil(matched.length / pageSize));
  const data = matched.slice((page - 1) * pageSize, page * pageSize);
  return { data, total: matched.length, page, pageSize, pages, stats: stats(rows) };
}

export function standard(url: string): Response {
  const parsed = new URL(url, "http://localhost");
  if (parsed.pathname.endsWith("/users/me")) return jsonResponse(OWNER);
  if (parsed.pathname.endsWith("/members/page"))
    return jsonResponse(pageOf(parsed.searchParams, team.rows));
  if (parsed.pathname.endsWith("/members")) return jsonResponse(team.rows);
  return jsonResponse([]);
}

export function renderAt(path: string): ReturnType<typeof createMemoryRouter> {
  writeSession({ token: "tok-1", name: "Ravi" });
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

export function lastPageRequest(): URL {
  const sent = sentRequests().filter((r) => r.url.includes("/members/page"));
  const last = sent[sent.length - 1];
  if (last === undefined) throw new Error("no /members/page request was sent");
  return new URL(last.url, "http://localhost");
}

/** Registers the shared setup and teardown for an Employees page test file. */
export function setUpEmployeesPageTests(): void {
  beforeAll(() => useApiBase());
  afterAll(() => clearApiBase());
  beforeEach(() => {
    installFetchMock();
    team.rows = defaultRows();
    setRespond(standard);
  });
  afterEach(() => {
    restoreFetchMock();
    window.localStorage.clear();
    cleanup();
  });
}
