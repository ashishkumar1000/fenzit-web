import { describe, expect, it } from "bun:test";
import { render, screen } from "@testing-library/react";
import { FenzitLoader } from "./FenzitLoader";
import { FenzitMark } from "./FenzitMark";

// Assertions stay on the DOM (roles, text, structure and attributes); the
// liquid fill's motion itself is SVG SMIL running in the DOM and is
// reviewed visually in the browser.
describe("FenzitLoader", () => {
  it("renders a status with the default label", () => {
    render(<FenzitLoader />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
  });

  it("passes a custom plain-English label through to the status", () => {
    render(<FenzitLoader label="Saving changes…" />);

    expect(screen.getByRole("status")).toHaveTextContent("Saving changes…");
  });

  it("renders no wordmark text in either variant (owner 2026-11-26: the artwork stands alone)", () => {
    render(<FenzitLoader variant="hero" />);
    expect(screen.queryByText("Fenzit")).toBeNull();
  });

  it("renders the animated liquid artwork: grey shell, wave mask and the twelve bubbles", () => {
    const { container } = render(<FenzitLoader variant="hero" />);

    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    // The empty grey shell is always beneath the liquid.
    expect(svg?.querySelector('use[fill="#dfe3e8"]')).not.toBeNull();
    // The wave mask that reveals the gradient artwork.
    expect(svg?.querySelector("mask")).not.toBeNull();
    // The artwork ships its twelve bubbles now — hero and inline share it.
    expect(container.querySelectorAll("circle")).toHaveLength(12);
  });

  it("keeps the mark decorative on the owner's artwork frame", () => {
    const { container } = render(<FenzitLoader variant="hero" />);

    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("viewBox", "130 135 760 755");
    expect(svg?.getAttribute("role")).toBeNull();
    expect(svg?.getAttribute("aria-label")).toBeNull();
  });

  it("two instances on one page never share ids", () => {
    const { container } = render(
      <>
        <FenzitMark />
        <FenzitMark />
      </>,
    );

    const clips = container.querySelectorAll("clipPath");
    expect(clips).toHaveLength(2);
    expect(clips[0].getAttribute("id")).not.toBe(clips[1].getAttribute("id"));
  });
});

describe("FenzitMark reduced motion", () => {
  it("renders the fully filled static branch — no SMIL, no mask, no bubbles", () => {
    // SMIL ignores the media query, so the component switches branch on
    // matchMedia; stub it for this test the way a reduced-motion browser
    // would answer.
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
    try {
      const { container } = render(<FenzitMark />);

      const svg = container.querySelector("svg");
      expect(svg).not.toBeNull();
      // No animation elements at all in this branch.
      expect(container.querySelectorAll("animate").length).toBe(0);
      expect(container.querySelectorAll("animateTransform").length).toBe(0);
      expect(svg?.querySelector("mask")).toBeNull();
      expect(container.querySelectorAll("circle").length).toBe(0);
      // The four coloured paths stand unmasked inside the silhouette clip,
      // fully filled with their gradients.
      const filled = svg?.querySelectorAll('g[clip-path] use[fill^="url(#"]');
      expect(filled?.length).toBe(4);
      // The grey shell is gone — the artwork is fully revealed.
      expect(svg?.querySelector('use[fill="#dfe3e8"]')).toBeNull();
    } finally {
      window.matchMedia = original;
    }
  });
});
