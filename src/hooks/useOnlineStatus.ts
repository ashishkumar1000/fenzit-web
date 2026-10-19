import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

function readOnline(): boolean {
  return navigator.onLine;
}

/** True while the browser reports a network connection. Updates on online and offline events. */
export function useOnlineStatus(): boolean {
  // The server has no network, so it assumes online. The real value comes after hydration.
  return useSyncExternalStore(subscribe, readOnline, () => true);
}
