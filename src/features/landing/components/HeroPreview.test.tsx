import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { HeroPreview } from "./HeroPreview";

afterEach(cleanup);

describe("HeroPreview", () => {
  it("shows the jobs panel and the attendance and leave panel side by side", () => {
    render(<HeroPreview />);

    expect(screen.getByRole("article", { name: "Jobs" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Attendance and leave" })).toBeInTheDocument();
  });

  it("keeps the mockup titles out of the page heading outline", () => {
    render(<HeroPreview />);

    expect(screen.queryByRole("heading", { name: "Jobs" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Attendance and leave" })).not.toBeInTheDocument();
  });

  it("shows every job with the status word the app uses", () => {
    render(<HeroPreview />);

    expect(screen.getByText("Water tank cleaning")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
    expect(screen.getByText("Pump repair")).toBeInTheDocument();
    expect(screen.getByText("In progress", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("Gate fitting")).toBeInTheDocument();
    expect(screen.getByText("Scheduled", { selector: "span" })).toBeInTheDocument();
  });

  it("shows the check-in with its GPS accuracy", () => {
    render(<HeroPreview />);

    expect(screen.getByText("Checked in 8:45 AM")).toBeInTheDocument();
    expect(screen.getByText(/GPS: 28\.6315° N, 77\.2167° E \(Accurate 3m\)/)).toBeInTheDocument();
  });

  it("hides the decorative drawings and the status dots from screen readers", () => {
    const { container } = render(<HeroPreview />);

    const decorative = container.querySelectorAll("svg[aria-hidden='true']");
    expect(decorative.length).toBeGreaterThan(0);
    for (const svg of decorative) {
      expect(svg.getAttribute("focusable")).toBe("false");
    }
  });
});
