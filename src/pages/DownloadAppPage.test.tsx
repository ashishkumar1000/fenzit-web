import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { APP_STORE_URL, PLAY_STORE_URL } from "../config/appStores";
import { DownloadAppPage } from "./DownloadAppPage";

const PLAY_LINK_NAME = "Get Fenzit on Google Play (opens the Play Store)";
const APP_STORE_LINK_NAME = "Download Fenzit on the App Store (opens the App Store)";

// The real hook reads navigator.userAgent, which happy-dom reports as a desktop
// Mac with no touch points ("other"). Every test pins the user agent it needs.
const originalUA = navigator.userAgent;
const originalTouch = navigator.maxTouchPoints;

function setDevice(userAgent: string, touchPoints = 0): void {
  Object.defineProperty(navigator, "userAgent", { value: userAgent, configurable: true });
  Object.defineProperty(navigator, "maxTouchPoints", { value: touchPoints, configurable: true });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <DownloadAppPage />
    </MemoryRouter>,
  );
}

/** Content-area queries: the landing Footer (outside <main>) has its own badges. */
function mainQueries() {
  return within(screen.getByRole("main"));
}

function refreshMeta(): Element | null {
  return document.head.querySelector('meta[http-equiv="refresh"]');
}

afterEach(() => {
  cleanup();
  setDevice(originalUA, originalTouch);
  // Defensive: if a hoisted meta ever survives unmount, the next platform's
  // assertions must not inherit it.
  refreshMeta()?.remove();
});

describe("DownloadAppPage", () => {
  it("on Android: instant meta refresh straight to the Play listing, badge as fallback", () => {
    setDevice(
      "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Mobile Safari/537.36",
    );
    renderPage();

    const meta = refreshMeta();
    expect(meta).toBeTruthy();
    // 0 seconds — instant redirect, the W3C H76 pattern; any delay fails WCAG 2.2.1.
    expect(meta?.getAttribute("content")).toBe(`0; url=${PLAY_STORE_URL}`);
    // Exactly one redirect tag — a second would fight the first.
    expect(document.head.querySelectorAll('meta[http-equiv="refresh"]').length).toBe(1);
    // The fallback must tell a stuck visitor what to do and offer the real link.
    expect(
      screen.getByText(
        "Taking you to Google Play to install the Fenzit app. If it does not open, tap the badge below.",
      ),
    ).toBeInTheDocument();
    expect(mainQueries().getByRole("link", { name: PLAY_LINK_NAME })).toHaveAttribute(
      "href",
      PLAY_STORE_URL,
    );
    // An Android visitor is mid-redirect to Play; an App Store badge would only confuse.
    expect(mainQueries().queryByRole("link", { name: APP_STORE_LINK_NAME })).toBeNull();
  });

  it("on desktop: no redirect at all, one badge per platform", () => {
    setDevice(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
    );
    renderPage();

    expect(refreshMeta()).toBeNull();
    expect(mainQueries().getByRole("link", { name: PLAY_LINK_NAME })).toHaveAttribute(
      "href",
      PLAY_STORE_URL,
    );
    expect(mainQueries().getByRole("link", { name: APP_STORE_LINK_NAME })).toHaveAttribute(
      "href",
      APP_STORE_URL,
    );
    expect(screen.getByText("iPhone and iPad")).toBeInTheDocument();
  });

  it("on iPhone: the App Store badge, no redirect, no Play badge", () => {
    setDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) Safari/605.1.15", 5);
    renderPage();

    expect(refreshMeta()).toBeNull();
    expect(screen.getByText("Get the Fenzit app on your iPhone")).toBeInTheDocument();
    expect(mainQueries().getByRole("link", { name: APP_STORE_LINK_NAME })).toHaveAttribute(
      "href",
      APP_STORE_URL,
    );
    expect(mainQueries().queryByRole("link", { name: PLAY_LINK_NAME })).toBeNull();
  });
});
