import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { PRICING_FAQ } from "../pricingContent";
import { PricingFaq } from "./PricingFaq";

afterEach(cleanup);

describe("PricingFaq", () => {
  it("lists every question and opens only the first answer", () => {
    const { container } = render(<PricingFaq />);

    expect(screen.getByRole("heading", { name: "Frequently asked questions" })).toBeInTheDocument();
    const items = container.querySelectorAll("details");
    expect(items).toHaveLength(PRICING_FAQ.length);
    expect(items[0]?.hasAttribute("open")).toBe(true);
    for (const item of Array.from(items).slice(1)) {
      expect(item.hasAttribute("open")).toBe(false);
    }
  });
});
