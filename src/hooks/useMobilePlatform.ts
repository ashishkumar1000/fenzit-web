import { useSyncExternalStore } from "react";
import { detectMobilePlatform, type MobilePlatform } from "../utils/mobilePlatform";

const noopSubscribe = (): (() => void) => () => {};

/**
 * The visitor's phone type. The server and the first client render use "other",
 * so the page never shows a store button that the visitor's phone does not need
 * and the markup matches on hydration. The real value comes in on the client.
 */
export function useMobilePlatform(): MobilePlatform {
  return useSyncExternalStore(
    noopSubscribe,
    () => detectMobilePlatform(navigator.userAgent, navigator.maxTouchPoints),
    () => "other",
  );
}
