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
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];
