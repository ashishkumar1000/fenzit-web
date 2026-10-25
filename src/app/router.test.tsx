import { afterAll, afterEach, beforeAll, describe, expect, it } from "bun:test";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import {
  AC_SERVICE_PAGE,
  ATTENDANCE_PAGE,
  COLLECTION_PAGE,
  DELIVERY_PAGE,
  FIELD_TRACKING_PAGE,
  PLUMBER_PAGE,
} from "./pageMeta";
import { routes } from "./router";

// Every use-case page must render its own heading under its own address, and hoist its own
// title — a miswired route or a copy-pasted content object shows up here as the wrong page.
const USE_CASE_ROUTES = [
  { path: ATTENDANCE_PAGE.path, title: ATTENDANCE_PAGE.title, heading: /without the register/i },
  {
    path: FIELD_TRACKING_PAGE.path,
    title: FIELD_TRACKING_PAGE.title,
    heading: /track every field job live/i,
  },
  {
    path: AC_SERVICE_PAGE.path,
    title: AC_SERVICE_PAGE.title,
    heading: /AC service software for installations/i,
  },
  {
    path: PLUMBER_PAGE.path,
    title: PLUMBER_PAGE.title,
    heading: /plumbing job management/i,
  },
  {
    path: DELIVERY_PAGE.path,
    title: DELIVERY_PAGE.title,
    heading: /track local deliveries/i,
  },
  {
    path: COLLECTION_PAGE.path,
    title: COLLECTION_PAGE.title,
    heading: /proof of every visit/i,
  },
];

function setOnline(value: boolean): void {
  Object.defineProperty(navigator, "onLine", { value, configurable: true });
}

function renderAt(path: string): void {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
}

// The home page waits for its country-code loader. Failing the request at once
// makes the loader fall back to India, so the tests never wait on the network.
const originalFetch = globalThis.fetch;
beforeAll(() => {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    throw new TypeError(`offline in tests: ${String(input)}`);
  }) as unknown as typeof fetch;
});

afterAll(() => {
  globalThis.fetch = originalFetch;
});

afterEach(() => {
  setOnline(true);
  cleanup();
});

describe("router", () => {
  it("renders the home page at /", async () => {
    renderAt("/");

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /run your jobs, attendance and leave/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Trusted by growing businesses" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Page not found")).toBeNull();
  });

  it.each(["/does-not-exist", "/a/b/c", "/index.html", "/HOME"])(
    "renders the not-found page for %s",
    (path) => {
      renderAt(path);

      expect(screen.getByRole("heading", { name: "This page is not here." })).toBeInTheDocument();
    },
  );

  it.each(USE_CASE_ROUTES)(
    "renders $path with its own heading and document title",
    ({ path, title, heading }) => {
      renderAt(path);

      expect(screen.getByRole("heading", { level: 1, name: heading })).toBeInTheDocument();
      expect(document.title).toBe(title);
    },
  );

  it("lists every public page in the footer's site-pages nav", () => {
    renderAt("/features");

    const nav = screen.getByRole("navigation", { name: "Site pages" });
    const hrefs = within(nav)
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));
    expect(hrefs).toEqual([
      "/features",
      "/attendance",
      "/field-job-tracking",
      "/ac-service-software",
      "/plumber-software",
      "/delivery-tracking",
      "/collection-agent-tracking",
    ]);
  });

  it("points the header's section links at the home page, so they work from any page", () => {
    renderAt("/attendance");

    const nav = screen.getByRole("navigation", { name: "Page sections" });
    const hrefs = within(nav)
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));
    expect(hrefs).toEqual(["/#how-it-works", "/#features", "/#trust", "/#faq"]);
  });

  it("links from the not-found page back to the home page", async () => {
    renderAt("/missing");

    const link = screen.getByRole("link", { name: "Go home" });
    expect(link).toHaveAttribute("href", "/");

    fireEvent.click(link);

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /run your jobs, attendance and leave/i,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Page not found")).toBeNull();
  });

  it("shows the offline banner on every route, not only the home page", () => {
    setOnline(false);
    renderAt("/missing");

    expect(screen.getByText(/you are offline/i)).toBeInTheDocument();
  });

  it("keeps the offline banner while the user navigates between routes", () => {
    setOnline(false);
    renderAt("/missing");
    expect(screen.getByText(/you are offline/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: "Go home" }));

    expect(screen.getByText(/you are offline/i)).toBeInTheDocument();
  });
});
