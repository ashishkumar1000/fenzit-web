import { useLocation } from "react-router";
import { FullPageLoader } from "../components/ui/FullPageLoader";

/**
 * The root-level hydration fallback for the console's boot (2026-11-26).
 *
 * Why a ROOT fallback and not the /admin route's own: the route-level
 * fallback (AdminChecking) is returned from the SAME lazy import as the
 * console layout, so React Router cannot render it until that module has
 * loaded — and by then the whole initial load resolves in one commit, so
 * the fallback never mounts. Measured on a live reload of /admin: zero
 * fallback frames and a ~4s blank window between load and first
 * contentful paint. This component ships with the eager root bundle, so it
 * paints from React's first commit and covers the ENTIRE initialization —
 * the /admin lazy chunk, the child lazy chunks, and both loader levels.
 *
 * Why the /admin guard: the public pages are pre-rendered and hydrate with
 * visible content already on screen, so an unguarded root fallback could
 * flash the Pour loader over them; returning null off the /admin subtree
 * (exactly "/admin" or a "/admin/…" path) keeps the prerendered output and
 * hydration clean.
 */
export function AdminBootFallback() {
  const location = useLocation();
  const path = location.pathname;
  const isAdminPath = path === "/admin" || path.startsWith("/admin/");
  if (!isAdminPath) {
    return null;
  }
  return <FullPageLoader label="Checking your access…" />;
}
