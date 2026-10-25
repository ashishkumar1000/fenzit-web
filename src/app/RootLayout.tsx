import { Outlet, ScrollRestoration } from "react-router";
import { OfflineBanner } from "../components/ui/OfflineBanner";

/** The shell every route renders inside: the offline banner above the page, and the router's
 * scroll handling, so navigating to a new page opens it at the top (and back/forward restores
 * where you were). */
export function RootLayout() {
  return (
    <>
      <OfflineBanner />
      <Outlet />
      <ScrollRestoration />
    </>
  );
}
