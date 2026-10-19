import { afterEach, describe, expect, it } from "bun:test";
import { act, render, screen } from "@testing-library/react";
import { OfflineBanner } from "./OfflineBanner";

function setOnline(value: boolean): void {
  Object.defineProperty(navigator, "onLine", { value, configurable: true });
}

afterEach(() => {
  setOnline(true);
});

describe("OfflineBanner", () => {
  it("shows nothing while online", () => {
    setOnline(true);
    render(<OfflineBanner />);

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("shows the offline message when the browser starts offline", () => {
    setOnline(false);
    render(<OfflineBanner />);

    expect(screen.getByRole("status")).toHaveTextContent(/you are offline/i);
  });

  it("appears and disappears as the browser fires offline and online events", () => {
    setOnline(true);
    render(<OfflineBanner />);

    setOnline(false);
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(screen.getByRole("status")).toBeInTheDocument();

    setOnline(true);
    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    expect(screen.queryByRole("status")).toBeNull();
  });
});
