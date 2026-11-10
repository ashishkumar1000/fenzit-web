/**
 * Where visitors get the Fenzit mobile app. One place, so the badge, footer and
 * FAQ never disagree. iOS is not live: add its constant here only when it ships.
 */
export const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.fenzit";

/**
 * Opens the Play Store app directly on Android (Chrome intent link). If the Play
 * Store app is missing, the browser falls back to the web listing above.
 */
export const PLAY_STORE_APP_LINK =
  "intent://details?id=com.fenzit#Intent;scheme=market;package=com.android.vending;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dcom.fenzit;end";

/** The App Store listing. Null until iOS ships; setting it shows the App Store button. */
export const APP_STORE_URL: string | null = null;
