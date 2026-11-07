import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import type { DossierMembership } from "../dossier-types";
import { CompanyPicker } from "./CompanyPicker";

afterEach(cleanup);

const A = "11111111-2222-4333-8444-555555555555";
const B = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

function membership(companyId: unknown, company: string): DossierMembership {
  return {
    companyId: companyId as string,
    company,
    role: "owner",
    status: "active",
    employeeCode: null,
    invitedBy: null,
    joined: null,
  } as DossierMembership;
}

function renderPicker(
  memberships: DossierMembership[],
  activeCompanyId: string | null,
  search = "?phone=9876&dialCode=%2B91",
) {
  const router = createMemoryRouter(
    [
      {
        path: "/admin/inspect",
        element: <CompanyPicker memberships={memberships} activeCompanyId={activeCompanyId} />,
      },
    ],
    { initialEntries: [`/admin/inspect${search}`] },
  );
  return render(<RouterProvider router={router} />);
}

describe("CompanyPicker: which memberships can be picked", () => {
  it("shows a link only for memberships that have a company id", () => {
    renderPicker([membership(A, "Alpha Pvt Ltd"), membership(null, "Beta Traders")], null);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0].textContent).toContain("Alpha Pvt Ltd");
  });

  it("shows a membership with no company id by name only, with the reason it cannot be picked", () => {
    renderPicker([membership(null, "Beta Traders")], null);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.getByText("Beta Traders")).toBeTruthy();
    expect(screen.getByText("Choosing this company is not available here yet.")).toBeTruthy();
  });

  it("treats an empty-string company id as not pickable", () => {
    renderPicker([membership("", "Gamma")], null);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("says the person has no companies when the list is empty", () => {
    renderPicker([], null);
    expect(screen.getByText("This person has no companies to pick.")).toBeTruthy();
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });
});

describe("CompanyPicker: the links and the picked company", () => {
  it("passes the company in ?company= and keeps the other lookup params", () => {
    renderPicker([membership(A, "Alpha Pvt Ltd"), membership(B, "Beta Traders")], null);
    const [first, second] = screen.getAllByRole("link");
    const firstUrl = new URL(first.getAttribute("href") ?? "", "https://x.test");
    expect(firstUrl.pathname).toBe("/admin/inspect");
    expect(firstUrl.searchParams.get("company")).toBe(A);
    expect(firstUrl.searchParams.get("phone")).toBe("9876");
    expect(firstUrl.searchParams.get("dialCode")).toBe("+91");
    expect(
      new URL(second.getAttribute("href") ?? "", "https://x.test").searchParams.get("company"),
    ).toBe(B);
  });

  it("marks the picked company as current and says so", () => {
    renderPicker([membership(A, "Alpha Pvt Ltd"), membership(B, "Beta Traders")], A);
    const current = screen
      .getAllByRole("link")
      .find((link) => link.getAttribute("aria-current") === "true");
    expect(current?.textContent).toContain("Alpha Pvt Ltd");
    expect(current?.textContent).toContain("Picked");
    expect(screen.getByText("You are working on Alpha Pvt Ltd.")).toBeTruthy();
  });

  it("matches an upper-case company id in the URL to the membership", () => {
    renderPicker([membership(A, "Alpha Pvt Ltd")], A.toUpperCase());
    expect(screen.getByText("You are working on Alpha Pvt Ltd.")).toBeTruthy();
  });

  it("offers a clear link that drops the company but keeps the phone", () => {
    renderPicker([membership(A, "Alpha Pvt Ltd")], A, `?phone=9876&company=${A}`);
    const clear = screen.getByRole("link", { name: "Stop working on this company" });
    const url = new URL(clear.getAttribute("href") ?? "", "https://x.test");
    expect(url.searchParams.has("company")).toBe(false);
    expect(url.searchParams.get("phone")).toBe("9876");
  });

  it("says no company is picked, and offers no clear link, when the URL has none", () => {
    renderPicker([membership(A, "Alpha Pvt Ltd")], null);
    expect(
      screen.getByText("No company picked. Pick one below before you act for a company."),
    ).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Stop working on this company" })).toBeNull();
  });
});
