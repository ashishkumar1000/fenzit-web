import type { LoaderFunction, RouteObject } from "react-router";
import { renderToString } from "react-dom/server";
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from "react-router";
import type { CountryCodesData } from "./services/countryCodes";
import { FALLBACK_COUNTRY_CODES } from "./services/countryCodes";
import { routes } from "./app/routes";

// The build has no network to the API, so the server cannot fetch the full list. It passes India
// alone as a plain list, not a promise. A promise would be serialised into the page as `{}`, and
// the browser would then read that as the country list and crash. After hydration the browser
// shows the same India-only list.
const STATIC_LOADER_DATA: CountryCodesData = {
  countryCodes: FALLBACK_COUNTRY_CODES,
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
  // The catch-all route exists for the browser's 404 page, which ships as the empty shell. A
  // pre-render that lands there means the prerendered page list and the route table disagree.
  if (context.matches.some((match) => match.route.path === "*")) {
    throw new Error(
      `Pre-render of ${url} hit the not-found route. Check the prerendered page list.`,
    );
  }
  const router = createStaticRouter(handler.dataRoutes, context);
  return renderToString(<StaticRouterProvider router={router} context={context} />);
}
