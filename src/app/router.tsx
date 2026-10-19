import { createBrowserRouter, type RouteObject } from "react-router";
import { countryCodesLoader } from "../features/landing/countryCodes";
import { earlyAccessAction } from "../features/landing/earlyAccessAction";
import { HomePage } from "../pages/HomePage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { RootLayout } from "./RootLayout";

/** Every route in the app. Exported so tests can build a memory router from the same table. */
export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    children: [
      { path: "/", element: <HomePage />, loader: countryCodesLoader, action: earlyAccessAction },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
