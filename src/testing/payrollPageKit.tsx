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
  type SentRequest,
} from "./fetchMock";
import { pageOf, row, team, type Row } from "./employeesPageKit";
import type {
  DeductionHeadView,
  EmploymentView,
  PayrollCalendarView,
  PayrollMonthStatusView,
  PayrollPfConfigView,
  PayrollPfExclusionView,
  PayrollStateRulesView,
  SalaryComponentView,
  SalaryStructureView,
  TdsConfigView,
} from "../features/admin/payrollViews";

/**
 * Fixtures and the honest fake for the payroll page tests. Reads answer
 * from `payroll` (tests overwrite fields before rendering); writes are
 * asserted on the wire via `sentTo`. The fake reuses the employees kit's
 * team for the pickers, so a test seeds `team.rows` the same way.
 */

export type ComponentRow = SalaryComponentView;

function component(id: string, name: string, isBasic = false, active = true): SalaryComponentView {
  return {
    id,
    name,
    isBasic,
    active,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };
}

function structure(
  effectiveFrom: string,
  lines: SalaryStructureView["lines"],
): SalaryStructureView {
  return {
    effectiveFrom,
    lines,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };
}

function employment(userId: string, overrides: Partial<EmploymentView> = {}): EmploymentView {
  return {
    userId,
    employeeCode: `E-${userId}`,
    joinDate: "2026-09-01",
    exitDate: null,
    pan: null,
    dateOfBirth: null,
    fatherName: null,
    motherName: null,
    spouseName: null,
    pfAccountNumber: null,
    uanNumber: null,
    designation: null,
    department: null,
    bankAccountNumber: null,
    ifscCode: null,
    bankName: null,
    ...overrides,
  };
}

const TDS: TdsConfigView = {
  taxYear: "FY 2026-27",
  regime: "new regime",
  standardDeduction: "75000.00",
  slabs: [
    { upto: 400000, ratePercent: 0 },
    { upto: 800000, ratePercent: 5 },
    { upto: null, ratePercent: 30 },
  ],
  rebate: {
    section: "157",
    threshold: 1200000,
    residentOnly: true,
    description: "up to ₹12,00,000",
  },
  cessRatePercent: 4,
};

const EPOCH = "1970-01-01T00:00:00.000Z";

/** The mutable fixture state the fake serves. */
export const payroll = {
  components: [] as SalaryComponentView[],
  structures: {} as Record<string, SalaryStructureView[]>,
  heads: [] as DeductionHeadView[],
  pfRows: [] as PayrollPfConfigView[],
  pfExclusions: {} as Record<string, PayrollPfExclusionView>,
  tds: TDS,
  calendar: [] as PayrollCalendarView[],
  monthStatus: null as PayrollMonthStatusView | null,
  stateRules: { notified: false, updatedAt: EPOCH } as PayrollStateRulesView,
  employment: {} as Record<string, EmploymentView>,
  /** When set, the named endpoint answers with this status + body — for
   *  refusal-copy tests. Keyed by `METHOD <path substring>` so a refusal on
   *  POST never poisons the GET. */
  refusals: {} as Record<string, { status: number; body: { error_code: string; message: string } }>,
};

export const BASIC_ID = "c-basic";
export const HRA_ID = "c-hra";
export const OLD_ID = "c-old";

/** A library shaped like a company mid-setup: Basic + HRA active, one
 *  inactive leftover. */
export function defaultComponents(): SalaryComponentView[] {
  return [
    component(BASIC_ID, "Basic salary", true),
    component(HRA_ID, "House rent allowance"),
    component(OLD_ID, "Old allowance", false, false),
  ];
}

export function defaultTeam(): Row[] {
  return [
    row("u-owner", "Ravi Kumar", "company_admin", "active"),
    row("u-a", "Asha V", "employee", "active"),
    row("u-b", "Bunty R", "employee", "active"),
    row("u-m", "Meera Joshi", "employee", "invited"),
  ];
}

function answerGet(path: string, pathname: string, method: string): Response | undefined {
  for (const [needle, refusal] of Object.entries(payroll.refusals)) {
    const [refusalMethod, ...needleParts] = needle.split(" ");
    if (refusalMethod === method && pathname.includes(needleParts.join(" "))) {
      return jsonResponse(refusal.body, refusal.status);
    }
  }
  if (pathname.endsWith("/payroll/components")) return jsonResponse(payroll.components);
  if (/\/members\/[^/]+\/salary-structures$/.test(pathname)) {
    const userId = pathname.split("/")[4];
    // The BE 404s a person who is not a member — the loader maps that to
    // "nobody chosen", so the fake must 404 unknown ids too.
    if (!team.rows.some((m) => m.userId === userId)) {
      return jsonResponse({ error_code: "RESOURCE_NOT_FOUND", message: "gone" }, 404);
    }
    return jsonResponse(payroll.structures[userId] ?? []);
  }
  if (pathname.endsWith("/payroll/deduction-heads")) return jsonResponse(payroll.heads);
  if (pathname.endsWith("/payroll/pf-config")) return jsonResponse(payroll.pfRows);
  if (/\/payroll\/employees\/[^/]+\/pf-exclusion$/.test(pathname)) {
    const userId = pathname.split("/")[5];
    if (!team.rows.some((m) => m.userId === userId)) {
      return jsonResponse({ error_code: "RESOURCE_NOT_FOUND", message: "gone" }, 404);
    }
    return jsonResponse(payroll.pfExclusions[userId] ?? { excluded: false, updatedAt: EPOCH });
  }
  if (pathname.endsWith("/payroll/tds-config")) return jsonResponse(payroll.tds);
  if (pathname.endsWith("/payroll/calendar")) return jsonResponse(payroll.calendar);
  if (/\/payroll\/months\/[\d-]+$/.test(pathname)) {
    return jsonResponse(payroll.monthStatus);
  }
  if (pathname.endsWith("/payroll/state-rules")) return jsonResponse(payroll.stateRules);
  if (/\/members\/[^/]+\/employment$/.test(pathname)) {
    const userId = pathname.split("/")[4];
    const row_ = payroll.employment[userId];
    return row_ === undefined
      ? jsonResponse({ error_code: "RESOURCE_NOT_FOUND", message: "gone" }, 404)
      : jsonResponse(row_);
  }
  void path;
  return undefined;
}

/** The payroll fake: the employees reads (the dialog tests live on the
 *  Employees page), then the payroll reads. Writes are not served — a test
 *  that saves asserts the wire and seeds whatever the follow-up read
 *  should show. */
export function payrollStandard(url: string): Response {
  const parsed = new URL(url, "http://localhost");
  const pathname = parsed.pathname;
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
  if (pathname.endsWith("/members/page")) {
    return jsonResponse(pageOf(parsed.searchParams, team.rows));
  }
  if (pathname.endsWith("/members")) {
    return jsonResponse(team.rows);
  }
  const answered = answerGet(url, pathname, method(url));
  if (answered !== undefined) return answered;
  return jsonResponse([]);
}

/** The recorded method of the request the fake is answering — the recorder
 *  pushes before responding, so the last entry is the live one. */
function method(url: string): string {
  const sent = sentRequests().filter((r) => r.url === url);
  return sent[sent.length - 1]?.method ?? "GET";
}

export function renderPayrollAt(path: string): ReturnType<typeof createMemoryRouter> {
  writeSession({ token: "tok-1", name: "Ravi" });
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

export function sentTo(pathSuffix: string): SentRequest[] {
  return sentRequests().filter((request) => request.url.includes(pathSuffix));
}

export function lastSent(pathSuffix: string, method?: string): SentRequest {
  const matched = sentTo(pathSuffix).filter((r) => (method ? r.method === method : true));
  const last = matched[matched.length - 1];
  if (last === undefined) throw new Error(`no ${method ?? "any"} request to ${pathSuffix}`);
  return last;
}

/** Registers the shared setup and teardown for a payroll test file. */
export function setUpPayrollPageTests(): void {
  beforeAll(() => useApiBase());
  afterAll(() => clearApiBase());
  beforeEach(() => {
    installFetchMock();
    payroll.components = defaultComponents();
    payroll.structures = {};
    payroll.heads = [];
    payroll.pfRows = [];
    payroll.pfExclusions = {};
    payroll.tds = TDS;
    payroll.calendar = [];
    payroll.monthStatus = null;
    payroll.stateRules = { notified: false, updatedAt: EPOCH };
    payroll.employment = { "u-a": employment("u-a") };
    payroll.refusals = {};
    team.rows = defaultTeam();
    setRespond(payrollStandard);
  });
  afterEach(() => {
    restoreFetchMock();
    window.localStorage.clear();
    cleanup();
  });
}

export { component as payrollComponent, employment as employmentRow, structure as structureRow };
