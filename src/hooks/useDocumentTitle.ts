import { useEffect, useRef } from "react";

/**
 * Sets the browser tab's title while the calling screen is mounted and puts
 * the title it found back when it leaves, so a client-side visit never leaves
 * the console reading another page's name. Re-titling while mounted (a tab
 * change) keeps the original title as the one to restore.
 */
export function useDocumentTitle(title: string): void {
  const previous = useRef<string | null>(null);
  const current = useRef(title);

  useEffect(() => {
    if (previous.current === null) previous.current = document.title;
    current.current = title;
    document.title = title;
  }, [title]);

  useEffect(() => {
    return () => {
      // Only undo our own title: if the next screen already named itself, it
      // owns the tab now.
      if (previous.current !== null && document.title === current.current) {
        document.title = previous.current;
      }
    };
  }, []);
}
