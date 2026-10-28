import { useSyncExternalStore } from "react";
import { readSession } from "../services/session";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

/**
 * Whether a sign-in is saved. A saved token is enough: the display name is
 * optional (the BE can return none), so it must not decide signed-in state.
 * Read through a store subscription so the first render matches the
 * pre-rendered HTML (no localStorage during hydration). The public pages
 * reload on log out, so no manual invalidation is needed.
 */
export function useIsSignedIn(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => readSession() !== null,
    () => false,
  );
}
