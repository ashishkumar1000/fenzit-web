import { ApiError, apiFetch } from "../../../services/api";

/**
 * Clients for the super-admin Config page (force-update rules and support
 * contact). The BE decides who may read or write (platform admin only); this
 * file only types what the page sends and shows.
 */

export interface PlatformRoadblock {
  minVersion: string;
  message: string;
  storeUrl: string;
}

export interface SupportContact {
  email: string;
  phone: string;
}

export interface AppRoadblockConfig {
  android: PlatformRoadblock;
  ios: PlatformRoadblock;
  support: SupportContact;
  /**
   * Live on Google Play. null: the server could not check. undefined: the server
   * does not send the field yet. Read-only.
   */
  liveAndroidVersion?: string | null;
}

/** What the page sends. The live version is read-only, so it is not sent back. */
export type AppRoadblockSave = Omit<AppRoadblockConfig, "liveAndroidVersion">;

const PATH = "/api/v1/admin/config/app-roadblocks";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPlatform(value: unknown): value is PlatformRoadblock {
  return (
    isRecord(value) &&
    typeof value.minVersion === "string" &&
    typeof value.message === "string" &&
    typeof value.storeUrl === "string"
  );
}

/** A string is the version; null means the server could not check; anything else (no field) is undefined. */
function readLiveVersion(value: unknown): string | null | undefined {
  if (typeof value === "string") return value;
  if (value === null) return null;
  return undefined;
}

/** Checks the shape of a config answer. A bad answer is a read error, not a half-filled form. */
export function parseAppRoadblockConfig(value: unknown): AppRoadblockConfig {
  if (
    !isRecord(value) ||
    !isPlatform(value.android) ||
    !isPlatform(value.ios) ||
    !isRecord(value.support) ||
    typeof value.support.email !== "string" ||
    typeof value.support.phone !== "string"
  ) {
    throw new ApiError(0, "The server sent a response the app could not read.");
  }
  return {
    android: value.android,
    ios: value.ios,
    support: { email: value.support.email, phone: value.support.phone },
    liveAndroidVersion: readLiveVersion(value.liveAndroidVersion),
  };
}

/** GET the current force-update rules and support contact. 403 when not a super admin. */
export async function fetchAppRoadblockConfig(
  token: string,
  signal?: AbortSignal,
): Promise<AppRoadblockConfig> {
  const body = await apiFetch<unknown>(PATH, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  return parseAppRoadblockConfig(body);
}

/** PUT the whole config. 422 carries field errors in `body.errors`; 403 when not a super admin. */
export async function saveAppRoadblockConfig(
  token: string,
  config: AppRoadblockSave,
  signal?: AbortSignal,
): Promise<AppRoadblockConfig> {
  const body = await apiFetch<unknown>(PATH, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(config),
    signal,
  });
  return parseAppRoadblockConfig(body);
}
