import { useEffect } from "react";

/**
 * Asks the browser to confirm before the tab closes or reloads while `active`
 * is true. In-app navigation is handled by the screen itself (useBlocker).
 */
export function useUnsavedWarning(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [active]);
}
