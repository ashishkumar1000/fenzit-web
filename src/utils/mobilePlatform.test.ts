import { describe, expect, test } from "bun:test";
import { detectMobilePlatform } from "./mobilePlatform";

const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const IPAD_SAFARI =
  "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const MAC_SAFARI =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 14; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
const DESKTOP_CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

describe("detectMobilePlatform", () => {
  test("iPhone is ios", () => {
    expect(detectMobilePlatform(IPHONE_SAFARI)).toBe("ios");
  });

  test("iPad is ios", () => {
    expect(detectMobilePlatform(IPAD_SAFARI)).toBe("ios");
  });

  test("iPadOS in desktop mode (reports as a Mac, with touch points) is ios", () => {
    expect(detectMobilePlatform(MAC_SAFARI, 5)).toBe("ios");
  });

  test("a real Mac with no touch points is other, not ios", () => {
    expect(detectMobilePlatform(MAC_SAFARI, 0)).toBe("other");
  });

  test("Android Chrome is android", () => {
    expect(detectMobilePlatform(ANDROID_CHROME)).toBe("android");
  });

  test("desktop Windows Chrome is other", () => {
    expect(detectMobilePlatform(DESKTOP_CHROME)).toBe("other");
  });

  test("an empty, missing or null user agent is other", () => {
    expect(detectMobilePlatform("")).toBe("other");
    expect(detectMobilePlatform(null)).toBe("other");
    expect(detectMobilePlatform(undefined)).toBe("other");
  });

  test("matching ignores case", () => {
    expect(detectMobilePlatform(IPHONE_SAFARI.toUpperCase())).toBe("ios");
    expect(detectMobilePlatform(ANDROID_CHROME.toUpperCase())).toBe("android");
  });

  test("a user agent naming both iPhone and Android resolves to ios", () => {
    expect(detectMobilePlatform(`${ANDROID_CHROME} iPhone`)).toBe("ios");
  });
});
