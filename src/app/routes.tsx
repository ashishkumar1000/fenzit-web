import type { RouteObject } from "react-router";
import { countryCodesLoader } from "../features/landing/countryCodes";
import { earlyAccessAction } from "../features/landing/earlyAccessAction";
import { FeaturesPage } from "../pages/FeaturesPage";
import { HomePage } from "../pages/HomePage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { RootLayout } from "./RootLayout";

/**
 * Every route in the app. Kept free of browser-only code, so the build can render it on the
 * server for the static pages, and tests can build a memory router from the same table.
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
      },
      { path: "/features", element: <FeaturesPage /> },
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
