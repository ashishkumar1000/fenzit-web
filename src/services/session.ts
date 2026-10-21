// The signed-in token lives in localStorage under one key. Only the token and
// the display name are stored. The role is never stored: the admin page asks
// GET /users/me for it on every load (web login spec).

export const SESSION_KEY = "fenzit.web.session";

export type StoredSession = {
  token: string;
  name: string | null;
};

/** Reads the saved sign-in. Anything missing or unreadable means signed out. */
export function readSession(): StoredSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (raw === null) return null;
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null || !("token" in value)) return null;
    if (typeof value.token !== "string" || value.token === "") return null;
    const name = "name" in value && typeof value.name === "string" ? value.name : null;
    return { token: value.token, name };
  } catch {
    return null;
  }
}

/** Saves the sign-in. Returns false when the browser refuses the write (private windows). */
export function writeSession(session: StoredSession): boolean {
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return true;
  } catch {
    return false;
  }
}

export function clearSession(): void {
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // Nothing to clear when the browser refuses storage.
  }
}
