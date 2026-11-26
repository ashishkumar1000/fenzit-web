import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "bun:test";
import { FullPageLoader } from "./FullPageLoader";

// The boot loader's contract is its render: one polite status, the hero
// Pour lockup. The pane's fixed positioning and blur are CSS, reviewed
// visually on /admin.
describe("FullPageLoader", () => {
  it("announces its label politely and hosts the hero Pour loader", () => {
    const { container } = render(<FullPageLoader label="Checking your access…" />);

    // The single status region carries the plain-English label.
    expect(screen.getByRole("status")).toHaveTextContent("Checking your access…");
    // The hero loader is the mark alone — no wordmark text (owner 2026-11-26).
    expect(screen.queryByText("Fenzit")).toBeNull();
    // One animated mark hosts the pour.
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("falls back to the default loading label", () => {
    render(<FullPageLoader />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
  });
});
