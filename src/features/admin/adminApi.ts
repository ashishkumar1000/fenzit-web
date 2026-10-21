import { apiFetch } from "../../services/api";

/**
 * The part of GET /users/me the admin page reads. The role and the platform
 * flag come only from this response, never from the stored token.
 */
export type CurrentUser = {
  name: string | null;
  role: string | null;
  platformAdmin: boolean;
};

/** GET /api/v1/users/me on fenzit-be. Needs the signed-in token. */
export function fetchCurrentUser(token: string, signal?: AbortSignal): Promise<CurrentUser> {
  return apiFetch<CurrentUser>("/api/v1/users/me", {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
}
