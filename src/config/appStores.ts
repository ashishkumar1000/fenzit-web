/**
 * Where visitors get the Fenzit mobile app. One place, so the badge, footer and
 * FAQ never disagree. iOS is not live: add its constant here only when it ships.
 */
export const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.fenzit";

/** The App Store listing. Null until iOS ships; setting it shows the App Store button. */
export const APP_STORE_URL: string | null = null;
