import { render, screen, act } from "@testing-library/react";
import { describe, expect, test } from "bun:test";
import { LoadingOverlay } from "./LoadingOverlay";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** The activity overlay's contract: nothing before the 300ms delay (a quick
 *  local operation never flashes it), the polite status once it is up, and
 *  it holds its minimum display before leaving. */
describe("LoadingOverlay", () => {
  test("stays out of the tree while pending is under the delay, then announces politely", async () => {
    const { container } = render(<LoadingOverlay show />);
    expect(container.querySelector("svg")).toBeNull();
    await act(async () => {
      await sleep(360);
    });
    expect(screen.getByRole("status")).not.toBeNull();
    expect(screen.getByText("Loading…")).not.toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
  });

  test("renders nothing when idle", () => {
    const { container } = render(<LoadingOverlay show={false} />);
    expect(container.querySelector("svg")).toBeNull();
  });
});
