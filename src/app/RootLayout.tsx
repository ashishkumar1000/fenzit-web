import { Outlet } from "react-router";
import { OfflineBanner } from "../components/ui/OfflineBanner";

/** The shell every route renders inside: the offline banner above the page. */
export function RootLayout() {
  return (
    <>
      <OfflineBanner />
      <Outlet />
    </>
  );
}
