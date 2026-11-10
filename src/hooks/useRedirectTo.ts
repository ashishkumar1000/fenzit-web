import { useEffect } from "react";

/**
 * Sends the visitor to `url` once the page has mounted. Passing null does nothing.
 * `replace` keeps the download page out of the back-button history.
 */
export function useRedirectTo(url: string | null): void {
  useEffect(() => {
    if (url !== null) window.location.replace(url);
  }, [url]);
}
