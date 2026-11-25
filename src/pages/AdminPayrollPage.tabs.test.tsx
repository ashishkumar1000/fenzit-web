import { describe, expect, it } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import { jsonResponse, setRespond, sentRequests } from "../testing/fetchMock";
import {
  BASIC_ID,
  payroll,
  renderPayrollAt,
  setUpPayrollPageTests,
  structureRow,
} from "../testing/payrollPageKit";

setUpPayrollPageTests();

describe("Payroll: the tabs fetch only their own section", () => {
  it("opens on Components and asks for the component library", async () => {
    renderPayrollAt("/admin/company/payroll");
    await screen.findByText("Basic salary");
    const reads = sentRequests().filter((r) => r.url.includes("/payroll/components"));
    expect(reads.length).toBe(1);
    // No other payroll section's endpoint fires for the bare address.
    expect(sentRequests().some((r) => r.url.includes("/payroll/deduction-heads"))).toBe(false);
    expect(sentRequests().some((r) => r.url.includes("/payroll/pf-config"))).toBe(false);
  });

  it("reads the revision list for the employee the address names", async () => {
    payroll.structures["u-a"] = [
      structureRow("2026-09-01", [
        {
          componentId: BASIC_ID,
          componentName: "Basic salary",
          amount: "20000.00",
          computedAmount: "20000.00",
        },
      ]),
    ];
    renderPayrollAt("/admin/company/payroll?tab=structures&employee=u-a");
    await screen.findByText(/Starts From/);
    expect(sentRequests().some((r) => r.url.includes("/members/u-a/salary-structures"))).toBe(true);
    // The picker needs the team and the line builder needs the library.
    expect(sentRequests().some((r) => r.url.endsWith("/members"))).toBe(true);
    expect(sentRequests().some((r) => r.url.includes("/payroll/components"))).toBe(true);
  });

  it("treats a stale employee id as nobody chosen, not as a failed page", async () => {
    // The kit 404s a member id that is not on the team — this exercises the
    // loader's BE-404 mapping, not just an empty fake answer.
    renderPayrollAt("/admin/company/payroll?tab=structures&employee=u-gone");
    await screen.findByText(/Please select an employee to see their salary details/);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("maps a refused exclusion read to the not-loaded line, not a broken page", async () => {
    renderPayrollAt("/admin/company/payroll?tab=statutory&pfEmployee=u-gone");
    // The picked id is unknown: the exclusion read 404s into "nobody picked".
    await screen.findByText(/Please select an employee to check their PF details/);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("renders each section's retry line when its read fails", async () => {
    payroll.refusals = {
      "GET /payroll/components": {
        status: 500,
        body: { error_code: "INTERNAL_ERROR", message: "boom" },
      },
    };
    renderPayrollAt("/admin/company/payroll?tab=components");
    await screen.findByText(/could not load/);
    expect(screen.getByRole("alert")).toBeTruthy();
  });

  it("reads the heads, statutory trio and calendar for their tabs", async () => {
    renderPayrollAt("/admin/company/payroll?tab=deductions");
    await screen.findByText("No deductions have been added yet.");
    renderPayrollAt("/admin/company/payroll?tab=statutory");
    await screen.findByText("Provident Fund (PF)");
    expect(sentRequests().some((r) => r.url.includes("/payroll/tds-config"))).toBe(true);
    expect(sentRequests().some((r) => r.url.includes("/payroll/pf-config"))).toBe(true);
  });

  it("probes the month the address asks about", async () => {
    renderPayrollAt("/admin/company/payroll?tab=calendar&month=2026-10");
    await screen.findByText("Check Salary Settings for a Month");
    expect(sentRequests().some((r) => r.url.includes("/payroll/months/2026-10"))).toBe(true);
    expect(sentRequests().some((r) => r.url.includes("/payroll/state-rules"))).toBe(true);
  });

  it("falls back to Components for an unknown tab", async () => {
    renderPayrollAt("/admin/company/payroll?tab=nonsense");
    await screen.findByText("Basic salary");
  });
});

const MEMBER_ME = {
  id: "u-emp",
  role: "employee",
  name: "Asha",
  platformAdmin: false,
  email: null,
  countryCode: "+91",
  phoneNumber: "9900000002",
  employeeCode: "E-1",
  status: "active",
};

function memberOnly(url: string): Response {
  const pathname = new URL(url, "http://localhost").pathname;
  if (pathname.endsWith("/users/me")) return jsonResponse(MEMBER_ME);
  return jsonResponse([]);
}

describe("Payroll: who may open it", () => {
  it("sends a member home instead of rendering the page", async () => {
    setRespond(memberOnly);
    // The redirect is the observable: the gate bounces to /admin, whose index
    // forwards a member to Me — the FINAL address must be /admin/me (a bare
    // "no fetch fired" waitFor would pass on its first tick, gate or no gate).
    const router = renderPayrollAt("/admin/company/payroll");
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/admin/me");
    });
    expect(sentRequests().some((r) => r.url.includes("/payroll/"))).toBe(false);
  });

  it("keeps the employment resource route behind the owner gate", async () => {
    setRespond(memberOnly);
    const router = renderPayrollAt("/admin/company/employees/employment?userId=u-a");
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/admin/me");
    });
    expect(sentRequests().some((r) => r.url.includes("/members/u-a/employment"))).toBe(false);
  });
});
