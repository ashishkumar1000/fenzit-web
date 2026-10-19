import { createBrowserRouter, type HydrationState } from "react-router";
import { countryCodesLoader } from "../features/landing/countryCodes";
import { routes } from "./routes";

export { routes };

/**
 * The home page's loader already ran on the server, so the browser starts from its list
 * instead of loading again. Without this the first render would be empty until the loader
 * returns, which would not match the pre-rendered HTML.
 */
const HOME_ROUTE_ID = "home";

function hydrationFor(pathname: string): HydrationState | undefined {
  if (pathname !== "/") return undefined;
  return { loaderData: { [HOME_ROUTE_ID]: countryCodesLoader() } };
}

export const router = createBrowserRouter(routes, {
  hydrationData: hydrationFor(window.location.pathname),
});
