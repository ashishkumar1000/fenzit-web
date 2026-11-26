import { render, screen, act, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, test } from "bun:test";
import {
  MAX_TOASTS,
  SESSION_ENDED_MESSAGE,
  dismissSessionEndedToasts,
  dismissToast,
  getToastsSnapshot,
  pushToast,
  resetToastsForTests,
} from "./toastStore";
import { ToastHost } from "./ToastHost";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

beforeEach(() => {
  resetToastsForTests();
});

describe("toastStore", () => {
  test("success toasts auto-dismiss; error toasts never do", async () => {
    pushToast("Saved successfully.", "success", 20);
    pushToast("The save failed.", "error", 20);

    expect(getToastsSnapshot()).toHaveLength(2);

    await act(async () => {
      await sleep(60);
    });

    const left = getToastsSnapshot();
    expect(left).toHaveLength(1);
    expect(left[0]?.tone).toBe("error");
  });

  test("the stack caps: the oldest non-error yields before any error", () => {
    pushToast("first", "success", 60_000);
    const errorId = pushToast("important failure", "error", 60_000);
    pushToast("third", "success", 60_000);
    pushToast("fourth", "success", 60_000);
    pushToast("fifth", "success", 60_000);

    const kept = getToastsSnapshot();
    expect(kept).toHaveLength(MAX_TOASTS);
    expect(kept.some((toast) => toast.id === errorId)).toBe(true);
    expect(kept.some((toast) => toast.message === "first")).toBe(false);
  });

  test("a stack that is entirely alerts yields its oldest to make room", () => {
    pushToast("first failure", "error", 60_000);
    pushToast("second failure", "error", 60_000);
    pushToast("third failure", "error", 60_000);
    pushToast("fourth failure", "error", 60_000);
    pushToast("fifth failure", "error", 60_000);

    const kept = getToastsSnapshot();
    expect(kept).toHaveLength(MAX_TOASTS);
    expect(kept.some((toast) => toast.message === "first failure")).toBe(false);
  });

  test("a fresh sign-in clears the stale session-ended alerts it left behind", () => {
    pushToast(SESSION_ENDED_MESSAGE, "error", 60_000);
    pushToast("Unrelated failure.", "error", 60_000);

    dismissSessionEndedToasts();

    const kept = getToastsSnapshot();
    expect(kept).toHaveLength(1);
    expect(kept[0]?.message).toBe("Unrelated failure.");
  });

  test("dismissing an unknown id is a no-op", () => {
    dismissToast(9999);
    expect(getToastsSnapshot()).toHaveLength(0);
  });
});

describe("ToastHost", () => {
  test("renders a completion as a polite status and dismisses it", () => {
    render(<ToastHost />);
    act(() => {
      pushToast("Invitation sent.", "success", 60_000);
    });

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Invitation sent.");

    act(() => {
      fireEvent.click(
        screen.getByRole("button", { name: "Dismiss notification: Invitation sent." }),
      );
    });
    expect(screen.queryByRole("status")).toBeNull();
  });

  test("renders a failure as an alert that stays until dismissed", async () => {
    render(<ToastHost />);
    act(() => {
      pushToast("Your session has ended. Please sign in again to continue.", "error", 20);
    });

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Your session has ended.");

    await act(async () => {
      await sleep(60);
    });
    expect(screen.getByRole("alert")).not.toBeNull();

    act(() => {
      fireEvent.click(
        screen.getByRole("button", {
          name: "Dismiss notification: Your session has ended. Please sign in again to continue.",
        }),
      );
    });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  test("keeps the two announcement roles apart in a mixed stack", () => {
    render(<ToastHost />);
    act(() => {
      pushToast("Customer added.", "success", 60_000);
      pushToast("Could not reach the server.", "error", 60_000);
    });

    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getAllByRole("alert")).toHaveLength(1);
  });
});
