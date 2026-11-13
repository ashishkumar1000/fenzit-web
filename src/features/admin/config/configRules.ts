import type { AppRoadblockConfig, AppRoadblockSave } from "./configApi";

/**
 * Client-side rules for the Config page. They mirror the backend rules so the
 * user sees a problem before the request is sent. The backend stays the
 * authority: its 422 errors are shown on the same fields.
 */

export const MESSAGE_MAX = 500;
const EMAIL_MAX = 254;
const VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Digits with an optional leading +, 8 to 15 digits in total (E.164 allows up to 15). */
const PHONE_PATTERN = /^\+?\d{8,15}$/;

export const STORE_HOSTS = {
  android: "play.google.com",
  ios: "apps.apple.com",
} as const;

export const FIELD_KEYS = [
  "android.minVersion",
  "android.storeUrl",
  "android.message",
  "ios.minVersion",
  "ios.storeUrl",
  "ios.message",
  "support.email",
  "support.phone",
] as const;

export type FieldKey = (typeof FIELD_KEYS)[number];
/** Every input's text, keyed by the same dotted name the BE uses in its 422 `errors`. */
export type ConfigDraft = Record<FieldKey, string>;
export type FieldErrors = Partial<Record<FieldKey, string>>;

export function draftFromConfig(config: AppRoadblockConfig): ConfigDraft {
  return {
    "android.minVersion": config.android.minVersion,
    "android.storeUrl": config.android.storeUrl,
    "android.message": config.android.message,
    "ios.minVersion": config.ios.minVersion,
    "ios.storeUrl": config.ios.storeUrl,
    "ios.message": config.ios.message,
    "support.email": config.support.email,
    "support.phone": config.support.phone,
  };
}

/** Trimmed values, the form that is sent and compared. */
function trimmed(draft: ConfigDraft): ConfigDraft {
  const result = {} as ConfigDraft;
  for (const key of FIELD_KEYS) {
    result[key] = draft[key].trim();
  }
  return result;
}

export function toConfigBody(draft: ConfigDraft): AppRoadblockSave {
  const value = trimmed(draft);
  return {
    android: {
      minVersion: value["android.minVersion"],
      storeUrl: value["android.storeUrl"],
      message: value["android.message"],
    },
    ios: {
      minVersion: value["ios.minVersion"],
      storeUrl: value["ios.storeUrl"],
      message: value["ios.message"],
    },
    // The backend takes digits with an optional +, so the spaces the user typed are removed.
    support: { email: value["support.email"], phone: value["support.phone"].replace(/ /g, "") },
  };
}

/** True when any field differs from what the server holds. */
export function isDirty(draft: ConfigDraft, saved: AppRoadblockConfig): boolean {
  const current = trimmed(draft);
  const original = trimmed(draftFromConfig(saved));
  return FIELD_KEYS.some((key) => current[key] !== original[key]);
}

function versionError(value: string): string | null {
  if (value === "") return "Enter the minimum version, like 1.4.0.";
  if (!VERSION_PATTERN.test(value)) return "Use three numbers with dots, like 1.4.0.";
  return null;
}

/** Numeric compare of dotted versions: > 0 if a is newer, < 0 if b is. Same rule as the BE. */
export function compareVersionNames(a: string, b: string): number {
  const parse = (v: string) => v.split(".").map((p) => parseInt(p, 10) || 0);
  const left = parse(a);
  const right = parse(b);
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** Why the Android minimum cannot be saved, for the popup: not three numbers, or newer than the live version. */
export type MinVersionRefusal = { kind: "invalid" } | { kind: "above-live"; live: string };

/**
 * The popup's reason, or null when the minimum is empty (a field error covers that),
 * unchanged from what is stored (the server only checks a change too), or acceptable.
 */
export function androidMinVersionRefusal(
  draft: ConfigDraft,
  liveAndroidVersion: string | null,
  storedAndroidMinVersion: string | null = null,
): MinVersionRefusal | null {
  const value = draft["android.minVersion"].trim();
  if (value === "" || value === storedAndroidMinVersion) return null;
  if (!VERSION_PATTERN.test(value)) return { kind: "invalid" };
  if (liveAndroidVersion !== null && compareVersionNames(value, liveAndroidVersion) > 0) {
    return { kind: "above-live", live: liveAndroidVersion };
  }
  return null;
}

/** Refuses a minimum newer than the live Google Play version. Skipped when the live version is unknown. */
function aboveLiveError(value: string, live: string | null): string | null {
  if (live === null || !VERSION_PATTERN.test(value)) return null;
  if (compareVersionNames(value, live) <= 0) return null;
  return `Version ${value} isn't live on Google Play yet. The latest live Android version is ${live}.`;
}

function storeUrlError(value: string, platform: keyof typeof STORE_HOSTS): string | null {
  const host = STORE_HOSTS[platform];
  if (value === "") return "Enter the store link.";
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return `Use a secure link on ${host}.`;
  }
  const safe =
    url.protocol === "https:" &&
    url.username === "" &&
    url.password === "" &&
    url.hostname === host;
  return safe ? null : `Use a secure link on ${host}.`;
}

function messageError(value: string): string | null {
  if (value === "") return "Enter the message users see.";
  if (value.length > MESSAGE_MAX) return `Keep the message to ${MESSAGE_MAX} characters or fewer.`;
  return null;
}

function emailError(value: string): string | null {
  if (value === "") return "Enter the support email address.";
  if (value.length > EMAIL_MAX || !EMAIL_PATTERN.test(value)) {
    return "Enter a valid email address, like name@fenzit.com.";
  }
  return null;
}

function phoneError(value: string): string | null {
  if (value === "") return "Enter the support phone number.";
  // Only spaces may separate the digits: the backend refuses hyphens and brackets.
  if (!PHONE_PATTERN.test(value.replace(/ /g, ""))) {
    return "Enter the phone number with the country code, like +91 92792 30451. Use digits and spaces only.";
  }
  return null;
}

const RULES: Record<FieldKey, (value: string) => string | null> = {
  "android.minVersion": versionError,
  "android.storeUrl": (value) => storeUrlError(value, "android"),
  "android.message": messageError,
  "ios.minVersion": versionError,
  "ios.storeUrl": (value) => storeUrlError(value, "ios"),
  "ios.message": messageError,
  "support.email": emailError,
  "support.phone": phoneError,
};

/**
 * Every field that breaks a rule, with the sentence to show under it. The
 * Android minimum is also checked against the live Google Play version when
 * the server reported one.
 */
export function validateDraft(
  draft: ConfigDraft,
  liveAndroidVersion: string | null = null,
  storedAndroidMinVersion: string | null = null,
): FieldErrors {
  const value = trimmed(draft);
  const errors: FieldErrors = {};
  for (const key of FIELD_KEYS) {
    const message = RULES[key](value[key]);
    if (message !== null) {
      errors[key] = message;
    }
  }
  const unchanged = value["android.minVersion"] === storedAndroidMinVersion;
  if (errors["android.minVersion"] === undefined && !unchanged) {
    const liveError = aboveLiveError(value["android.minVersion"], liveAndroidVersion);
    if (liveError !== null) errors["android.minVersion"] = liveError;
  }
  return errors;
}

/** Reads the BE's 422 `errors` map, keeping only the fields this page shows. */
export function fieldErrorsFrom(body: unknown): FieldErrors {
  if (typeof body !== "object" || body === null || !("errors" in body)) return {};
  const errors = body.errors;
  if (typeof errors !== "object" || errors === null) return {};
  const result: FieldErrors = {};
  for (const key of FIELD_KEYS) {
    const message: unknown = Reflect.get(errors, key);
    if (typeof message === "string") {
      result[key] = message;
    }
  }
  return result;
}

/** Reads the posted form back into a draft. Missing fields become empty text. */
export function draftFromForm(form: FormData): ConfigDraft {
  const result = {} as ConfigDraft;
  for (const key of FIELD_KEYS) {
    const raw = form.get(key);
    result[key] = typeof raw === "string" ? raw : "";
  }
  return result;
}
