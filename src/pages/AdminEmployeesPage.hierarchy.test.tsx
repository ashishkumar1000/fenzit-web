import { describe, expect, it } from "bun:test";
import { screen, within } from "@testing-library/react";
import { jsonResponse, sentRequests, setRespond } from "../testing/fetchMock";
import {
  renderAt,
  row,
  setUpEmployeesPageTests,
  standard,
  team,
} from "../testing/employeesPageKit";

// The team table's Reports-to column (Epic 24, CAP-6): the upward chain with
// the top admin marked, the headcount below the person, the top-of-team line
// for an admin, and an honest degradation when the roster read fails. The
// cell is read-only — the edit lives on the member's record.

setUpEmployeesPageTests();

const OWNER = row("u-owner", "Ravi Kumar", "company_admin", "active");
OWNER.headcount = 2;

const PRIYA = {
  ...row("u-priya", "Priya Nair", "employee", "active"),
  managerId: "u-owner",
  managerName: "Ravi Kumar",
  chain: [{ userId: "u-owner", name: "Ravi Kumar" }],
};

const MEERA = {
  ...row("u-meera", "Meera Joshi", "employee", "active"),
  managerId: "u-priya",
  managerName: "Priya Nair",
  chain: [
    { userId: "u-priya", name: "Priya Nair" },
    { userId: "u-owner", name: "Ravi Kumar" },
  ],
  headcount: 3,
  directReports: 3,
};

const BUNTY = row("u-bunty", "Bunty R", "employee", "active");

describe("AdminEmployeesPage: the Reports-to column", () => {
  it("prints the chain with the top admin marked and the headcount below the person", async () => {
    team.rows = [OWNER, PRIYA, MEERA, BUNTY];
    renderAt("/admin/company/employees");
    await screen.findByText("Meera Joshi");

    expect(screen.getByRole("columnheader", { name: "Reports to" })).toBeInTheDocument();

    const priyaRow = screen.getByText("Priya Nair").closest("tr") as HTMLElement;
    expect(within(priyaRow).getByText("Ravi Kumar (Owner)")).toBeInTheDocument();

    const meeraRow = screen.getByText("Meera Joshi").closest("tr") as HTMLElement;
    expect(within(meeraRow).getByText("Priya Nair → Ravi Kumar (Owner)")).toBeInTheDocument();
    expect(within(meeraRow).getByText("3 people report to them")).toBeInTheDocument();

    const buntyRow = screen.getByText("Bunty R").closest("tr") as HTMLElement;
    expect(within(buntyRow).getByText("Not set")).toBeInTheDocument();
  });

  it("puts an admin at the top of the team and still counts their reports", async () => {
    team.rows = [OWNER, PRIYA, MEERA, BUNTY];
    renderAt("/admin/company/employees");
    const topLine = await screen.findByText("Admins sit at the top of the team.");
    const ownerRow = topLine.closest("tr") as HTMLElement;
    expect(within(ownerRow).getByText("2 people report to them")).toBeInTheDocument();
  });

  it("is read-only — the chain is not a control", async () => {
    team.rows = [OWNER, PRIYA, MEERA, BUNTY];
    renderAt("/admin/company/employees");
    await screen.findByText("Meera Joshi");
    const chain = screen.getByText("Priya Nair → Ravi Kumar (Owner)");
    expect(chain.closest("button")).toBeNull();
    expect(chain.closest("a")).toBeNull();
  });

  it("reads the whole roster in the same page load (the (Owner) mark needs roles)", async () => {
    team.rows = [OWNER, PRIYA, MEERA, BUNTY];
    renderAt("/admin/company/employees");
    await screen.findByText("Meera Joshi");
    const rosterReads = sentRequests().filter(
      (request) => request.method === "GET" && new URL(request.url).pathname.endsWith("/members"),
    );
    expect(rosterReads).toHaveLength(1);
  });

  it("degrades to plain chain names when the roster read fails, never a blank table", async () => {
    team.rows = [OWNER, PRIYA, MEERA, BUNTY];
    setRespond((url) => {
      const path = new URL(url, "http://localhost").pathname;
      if (path.endsWith("/members")) {
        return jsonResponse({ error_code: "INTERNAL_SERVER_ERROR", message: "boom" }, 500);
      }
      return standard(url);
    });
    renderAt("/admin/company/employees");
    await screen.findByText("Meera Joshi");
    const meeraRow = screen.getByText("Meera Joshi").closest("tr") as HTMLElement;
    expect(within(meeraRow).queryByText("Priya Nair → Ravi Kumar (Owner)")).toBeNull();
    expect(within(meeraRow).getByText("Priya Nair → Ravi Kumar")).toBeInTheDocument();
  });

  it("keeps an admin's top-of-team line even with no roster", async () => {
    team.rows = [OWNER, PRIYA, MEERA, BUNTY];
    setRespond((url) => {
      const path = new URL(url, "http://localhost").pathname;
      if (path.endsWith("/members")) return jsonResponse({});
      return standard(url);
    });
    renderAt("/admin/company/employees");
    const topLine = await screen.findByText("Admins sit at the top of the team.");
    expect(topLine).toBeInTheDocument();
  });
});
