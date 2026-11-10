import { describe, expect, test } from "bun:test";
import { APP_STORE_URL, PLAY_STORE_APP_LINK, PLAY_STORE_URL } from "./appStores";

describe("store links", () => {
  test("the web listing is the one Play URL for the package", () => {
    expect(PLAY_STORE_URL).toBe("https://play.google.com/store/apps/details?id=com.fenzit");
  });

  test("the Android app link opens the Play Store app and falls back to the web listing", () => {
    expect(PLAY_STORE_APP_LINK.startsWith("intent://details?id=com.fenzit#Intent;")).toBe(true);
    expect(PLAY_STORE_APP_LINK).toContain("scheme=market");
    expect(PLAY_STORE_APP_LINK).toContain("package=com.android.vending");
    expect(PLAY_STORE_APP_LINK).toContain(
      `S.browser_fallback_url=${encodeURIComponent(PLAY_STORE_URL)}`,
    );
    expect(PLAY_STORE_APP_LINK.endsWith(";end")).toBe(true);
  });

  test("the App Store link stays unset until iOS ships", () => {
    expect(APP_STORE_URL).toBeNull();
  });
});
