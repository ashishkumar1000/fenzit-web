import type { RouteObject } from "react-router";
import { countryCodesLoader } from "../services/countryCodes";
import { earlyAccessAction } from "../features/landing/earlyAccessAction";
import { UseCasePage } from "../features/use-case/components/UseCasePage";
import { AC_SERVICE_CONTENT } from "../features/use-case/content/acService";
import { COLLECTION_CONTENT } from "../features/use-case/content/collection";
import { DELIVERY_CONTENT } from "../features/use-case/content/delivery";
import { FIELD_TRACKING_CONTENT } from "../features/use-case/content/fieldTracking";
import { PLUMBER_CONTENT } from "../features/use-case/content/plumber";
import { AttendancePage } from "../pages/AttendancePage";
import { FeaturesPage } from "../pages/FeaturesPage";
import { HomePage } from "../pages/HomePage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { RootLayout } from "./RootLayout";

/**
 * Every route in the app. Kept free of browser-only code, so the build can render it on the
 * server for the static pages, and tests can build a memory router from the same table.
 *
 * The use-case pages share one template; each route pairs it with its own content.
 */
export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    children: [
      {
        id: "home",
        path: "/",
        element: <HomePage />,
        loader: countryCodesLoader,
        action: earlyAccessAction,
        // The country list does not change after a submit. Reloading it would replace the
        // full list with the India fallback while the new request runs.
        shouldRevalidate: () => false,
      },
      { path: "/features", element: <FeaturesPage /> },
      { path: "/attendance", element: <AttendancePage /> },
      {
        path: "/field-job-tracking",
        element: <UseCasePage content={FIELD_TRACKING_CONTENT} />,
      },
      { path: "/ac-service-software", element: <UseCasePage content={AC_SERVICE_CONTENT} /> },
      { path: "/plumber-software", element: <UseCasePage content={PLUMBER_CONTENT} /> },
      { path: "/delivery-tracking", element: <UseCasePage content={DELIVERY_CONTENT} /> },
      { path: "/collection-agent-tracking", element: <UseCasePage content={COLLECTION_CONTENT} /> },
      // Client-only pages, loaded on first visit. They depend on the saved sign-in, so they are
      // not pre-rendered. Their code is split out of the landing page's bundle.
      {
        path: "/login",
        lazy: async () => {
          const [{ LoginPage }, { loginAction }] = await Promise.all([
            import("../pages/LoginPage"),
            import("../features/login/loginAction"),
          ]);
          return { Component: LoginPage, action: loginAction };
        },
      },
      {
        path: "/admin",
        lazy: async () => {
          const [{ AdminPage, AdminChecking }, { adminLoader }] = await Promise.all([
            import("../pages/AdminPage"),
            import("../features/admin/adminLoader"),
          ]);
          return {
            Component: AdminPage,
            loader: adminLoader,
            HydrateFallback: AdminChecking,
          };
        },
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];
