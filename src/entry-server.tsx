import type { LoaderFunction, RouteObject } from "react-router";
import { renderToString } from "react-dom/server";
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from "react-router";
import type { CountryCode, CountryCodesData } from "./features/landing/countryCodes";
import { routes } from "./app/routes";

// The build has no network to the API, so this list never settles on the server. The form then
// renders its Suspense fallback, which is India alone: the same markup the browser shows first.
// After hydration the browser swaps in the full list.
const STATIC_LOADER_DATA: CountryCodesData = {
  countryCodes: new Promise<CountryCode[]>(() => {}),
};

const staticLoader: LoaderFunction = () => STATIC_LOADER_DATA;

function withStaticLoaders(list: RouteObject[]): RouteObject[] {
  return list.map((route): RouteObject => {
    if (!route.children) return route;
    const children = route.children.map((child): RouteObject => {
      return child.loader ? { ...child, loader: staticLoader } : child;
    });
    return { ...route, children };
  });
}

/** The markup for one URL, rendered on the server at build time. */
export async function renderPage(url: string): Promise<string> {
  const handler = createStaticHandler(withStaticLoaders(routes));
  const context = await handler.query(new Request(new URL(url, "http://localhost")));
  if (context instanceof Response) {
    throw new Error(`Pre-render of ${url} returned a response, not a page.`);
  }
  const router = createStaticRouter(handler.dataRoutes, context);
  return renderToString(<StaticRouterProvider router={router} context={context} />);
}
