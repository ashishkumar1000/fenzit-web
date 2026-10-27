import { useSyncExternalStore } from "react";
import { readSession } from "../services/session";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

/**
 * The saved sign-in's name, read through a store subscription so the first
 * render matches the pre-rendered HTML (no localStorage during hydration).
 * The public pages reload on log out, so no manual invalidation is needed.
 */
export function useSessionName(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => readSession()?.name ?? null,
    () => null,
  );
}
