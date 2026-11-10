export type MobilePlatform = "android" | "ios" | "other";

/**
 * Reads the phone type from the browser's user agent. Used only to choose which
 * store button to show; it is never used for access or security.
 *
 * iPadOS in desktop mode reports itself as a Mac, so a Mac with touch points is
 * treated as an iPad. iPhone is checked before Android, so a user agent that
 * names both resolves to iOS.
 */
export function detectMobilePlatform(
  userAgent: string | null | undefined,
  touchPoints = 0,
): MobilePlatform {
  const ua = (userAgent ?? "").toLowerCase();
  if (ua === "") return "other";
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/macintosh/.test(ua) && touchPoints > 1) return "ios";
  if (/android/.test(ua)) return "android";
  return "other";
}
