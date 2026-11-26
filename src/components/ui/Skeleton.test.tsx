import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { SKELETON_DELAY_MS, SKELETON_MIN_DISPLAY_MS, SkeletonDelay } from "./Skeleton";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// The two binding thresholds from the loading cases (100–300ms shows no
// skeleton; once shown, 500ms minimum), pinned as the contract.
describe("Skeleton thresholds", () => {
  it("carries the loading cases' 300ms delay and 500ms minimum display", () => {
    expect(SKELETON_DELAY_MS).toBe(300);
    expect(SKELETON_MIN_DISPLAY_MS).toBe(500);
  });
});

describe("SkeletonDelay", () => {
  it("shows nothing until the wait passes the 300ms delay", async () => {
    const view = render(
      <SkeletonDelay show>
        <p>skeleton line</p>
      </SkeletonDelay>,
    );

    expect(screen.queryByText("skeleton line")).toBeNull();

    await act(async () => {
      await sleep(SKELETON_DELAY_MS + 80);
    });
    expect(screen.getByText("skeleton line")).toBeInTheDocument();
    view.unmount();
  });

  it("keeps a shown skeleton for the 500ms minimum after the data arrives", async () => {
    const view = render(
      <SkeletonDelay show>
        <p>skeleton line</p>
      </SkeletonDelay>,
    );

    await act(async () => {
      await sleep(SKELETON_DELAY_MS + 80);
    });
    expect(screen.getByText("skeleton line")).toBeInTheDocument();

    // The data arrives while the skeleton has barely been up: it must stay
    // until it has been visible for 500ms, so it reads as a state.
    view.rerender(
      <SkeletonDelay show={false}>
        <p>skeleton line</p>
      </SkeletonDelay>,
    );
    await act(async () => {
      await sleep(120);
    });
    expect(screen.getByText("skeleton line")).toBeInTheDocument();

    await act(async () => {
      await sleep(SKELETON_MIN_DISPLAY_MS);
    });
    expect(screen.queryByText("skeleton line")).toBeNull();
    view.unmount();
  });

  it("never appears when the wait ends inside the delay", async () => {
    const view = render(
      <SkeletonDelay show>
        <p>skeleton line</p>
      </SkeletonDelay>,
    );

    await act(async () => {
      await sleep(100);
    });
    view.rerender(
      <SkeletonDelay show={false}>
        <p>skeleton line</p>
      </SkeletonDelay>,
    );
    await act(async () => {
      await sleep(SKELETON_DELAY_MS + 100);
    });
    expect(screen.queryByText("skeleton line")).toBeNull();
    view.unmount();
  });
});

// The shimmer is CSS motion, so its reduced-motion fallback lives in the
// stylesheet: the sweep ships under the no-preference gate, and a reduce
// block replaces it with static sunken blocks (CAP-7).
describe("reduced motion", () => {
  it("falls back to static sunken blocks in the shimmer's stylesheet", () => {
    const css = readFileSync(new URL("./Skeleton.module.css", import.meta.url), "utf8");

    expect(css).toContain("@media (prefers-reduced-motion: no-preference)");
    expect(css).toContain("skeleton-shimmer");
    const reduceBlock = css.split("@media (prefers-reduced-motion: reduce)")[1] ?? "";
    expect(reduceBlock).toContain("background-image: none");
    expect(reduceBlock).toContain("var(--color-surface-sunken)");
  });
});
