import { apiFetch } from "../../services/api";
import type { LookupResponse } from "./dossier-types";

/**
 * Clients for the staff-only admin endpoints (the Inspect and Account
 * sections). Every call goes through apiFetch, so timeouts, correlation
 * headers and the error_code envelope are uniform.
 */

export type CurrentUser = {
  id: string;
  name: string | null;
  role: string | null;
  platformAdmin: boolean;
  email: string | null;
  countryCode: string;
  phoneNumber: string;
  employeeCode: string | null;
  status: string | null;
};

/** GET /api/v1/users/me on fenzit-be. Needs the signed-in token. */
export function fetchCurrentUser(token: string, signal?: AbortSignal): Promise<CurrentUser> {
  return apiFetch<CurrentUser>("/api/v1/users/me", {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
}

/** Exact-phone dossier. 404 (RESOURCE_NOT_FOUND) means no person has the number. */
export function lookupUser(
  token: string,
  phone: string,
  signal?: AbortSignal,
): Promise<LookupResponse> {
  return apiFetch<LookupResponse>(`/api/v1/admin/users/lookup?phone=${encodeURIComponent(phone)}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
}

/** Promote (true) or demote (false) the platform-admin staff flag. */
export function setPlatformAdminFlag(
  token: string,
  userId: string,
  value: boolean,
): Promise<{ userId: string; platformAdmin: boolean }> {
  return apiFetch<{ userId: string; platformAdmin: boolean }>(
    `/api/v1/admin/users/${userId}/platform-admin`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ value }),
    },
  );
}

/** Disable or re-enable an account through the existing staff endpoints. */
export function setUserDisabled(
  token: string,
  userId: string,
  disabled: boolean,
): Promise<{ userId: string; disabled: boolean }> {
  return apiFetch<{ userId: string; disabled: boolean }>(
    `/api/v1/admin/users/${userId}/${disabled ? "disable" : "enable"}`,
    { method: "POST", headers: { Authorization: `Bearer ${token}` } },
  );
}
