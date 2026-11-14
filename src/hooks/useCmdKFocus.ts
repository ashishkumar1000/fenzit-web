import { useEffect, type RefObject } from "react";

/** Focuses the given input when the user presses Cmd/Ctrl+K — the console
 *  search shortcut. This effect touches no server data; the useEffect ban
 *  targets fetching and syncing in render code, which is not what happens
 *  here. */
export function useCmdKFocus(inputRef: RefObject<HTMLInputElement | null>): void {
  useEffect(() => {
    function onKey(event: KeyboardEvent): void {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inputRef]);
}
