import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { Audience } from "./Audience";

afterEach(cleanup);

describe("Audience", () => {
  it("renders both cards with a drawn mark beside the title, not a lucide glyph", () => {
    const { container } = render(<Audience />);

    expect(
      screen.getByRole("heading", { name: "Built for owners and employees" }),
    ).toBeInTheDocument();
    const heads = container.querySelectorAll("article > div");
    expect(heads).toHaveLength(2);
    for (const head of heads) {
      expect(head.querySelectorAll("span > svg")).toHaveLength(1);
      expect(head.querySelector("h3")?.textContent).toMatch(/^For (owners|employees)$/);
    }
  });

  it("keeps the background texture decorative and the cards in a layer above it", () => {
    const { container } = render(<Audience />);

    const section = container.querySelector("section");
    const pattern = section?.querySelector(":scope > svg");
    expect(pattern?.getAttribute("aria-hidden")).toBe("true");
    expect(section?.querySelector(":scope > svg circle")).not.toBeNull();
    const content = section?.querySelector(":scope > div");
    expect(content?.querySelector("article")).not.toBeNull();
  });

  it("gives every bullet exactly one check icon with the text as the label", () => {
    const { container } = render(<Audience />);

    const items = container.querySelectorAll("article li");
    expect(items).toHaveLength(6);
    for (const item of items) {
      expect(item.querySelectorAll("svg")).toHaveLength(1);
      expect(item.textContent?.length ?? 0).toBeGreaterThan(0);
    }
    expect(
      screen.getByText("Create jobs and assign the right skill and team."),
    ).toBeInTheDocument();
    expect(screen.getByText("Check in and out, and see your own month.")).toBeInTheDocument();
  });
});
