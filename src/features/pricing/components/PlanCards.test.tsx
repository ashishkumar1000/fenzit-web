import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { CONTACT_EMAIL } from "../../../config/contact";
import { PLANS } from "../pricingContent";
import { PlanCards } from "./PlanCards";

afterEach(cleanup);

function renderCards() {
  return render(
    <MemoryRouter>
      <PlanCards />
    </MemoryRouter>,
  );
}

describe("PlanCards", () => {
  it("shows every plan with its features", () => {
    renderCards();

    for (const plan of PLANS) {
      expect(screen.getByRole("heading", { name: plan.name })).toBeInTheDocument();
      for (const feature of plan.features) {
        expect(screen.getByText(feature)).toBeInTheDocument();
      }
    }
  });

  it("marks only the middle plan as most popular", () => {
    renderCards();

    expect(screen.getAllByText("Most popular")).toHaveLength(1);
    const growth = screen.getByRole("heading", { name: "Growth" }).closest("li");
    expect(within(growth as HTMLElement).getByText("Most popular")).toBeInTheDocument();
  });

  it("sends the starter and growth buttons to the demo page and enterprise to email", () => {
    renderCards();

    const starter = screen.getByRole("link", { name: "Start free trial" });
    expect(starter.getAttribute("href")).toBe("/book-demo");
    const growth = screen.getByRole("link", { name: "Claim 90 days free" });
    expect(growth.getAttribute("href")).toBe("/book-demo");
    const enterprise = screen.getByRole("link", { name: "Contact sales" });
    expect(enterprise.getAttribute("href")).toBe(`mailto:${CONTACT_EMAIL}`);
  });
});
