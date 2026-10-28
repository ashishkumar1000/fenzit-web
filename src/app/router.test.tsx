import { afterAll, afterEach, beforeAll, describe, expect, it } from "bun:test";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { ATTENDANCE_PAGE, PUBLIC_PAGES } from "./pageMeta";
import { ALL_USE_CASE_CONTENT } from "../features/use-case/content/registry";
import { routes } from "./router";

// Every use-case page must render its own heading under its own address, and hoist its own
// title — a miswired route or a copy-pasted content object shows up here as the wrong page.
// The list is the registry itself, so a new page is covered the moment it joins.
const USE_CASE_ROUTES = [
  { path: ATTENDANCE_PAGE.path, title: ATTENDANCE_PAGE.title, heading: /without the register/i },
  ...ALL_USE_CASE_CONTENT.map((content) => ({
    path: content.meta.path,
    title: content.meta.title,
    heading: content.heading,
  })),
];

function setOnline(value: boolean): void {
  Object.defineProperty(navigator, "onLine", { value, configurable: true });
}

type TestRouter = ReturnType<typeof createMemoryRouter>;

function renderAt(path: string): TestRouter {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
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

    // The footer splits the pages into a Company nav and a Solutions nav; together they list every page.
    const hrefs = ["Company pages", "Solution pages"].flatMap((name) =>
      within(screen.getByRole("navigation", { name }))
        .getAllByRole("link")
        .map((link) => link.getAttribute("href")),
    );
    // Derived from the meta list, so a page added there but forgotten in the footer fails here.
    expect(hrefs).toEqual(PUBLIC_PAGES.map((page) => page.path));
  });

  // The "Fenzit also helps" links are the site's SEO cross-links; these assertions keep a
  // rotation bug or a copy-pasted label from shipping in the static HTML of all 20 pages.
  it.each(ALL_USE_CASE_CONTENT.map((content) => ({ path: content.meta.path })))(
    "renders four sibling links on $path, none pointing at the page itself",
    ({ path }) => {
      renderAt(path);

      const cta = screen.getByRole("region", { name: "See it working for your team" });
      const siblingLinks = within(within(cta).getByRole("list")).getAllByRole("link");
      expect(siblingLinks).toHaveLength(4);
      expect(new Set(siblingLinks.map((link) => link.getAttribute("href"))).size).toBe(4);
      for (const link of siblingLinks) {
        const target = ALL_USE_CASE_CONTENT.find(
          (entry) => entry.meta.path === link.getAttribute("href"),
        );
        expect(target).toBeDefined();
        expect(link).toHaveTextContent(target?.shortLabel ?? "");
      }
    },
  );

  it("makes the header's brand a link back to the home page", () => {
    renderAt("/attendance");

    const brand = screen.getByRole("link", { name: "Fenzit" });
    expect(brand).toHaveAttribute("href", "/");
  });

  it("points the header's section links at the home page, so they work from any page", () => {
    renderAt("/attendance");

    const nav = screen.getByRole("navigation", { name: "Page sections" });
    const hrefs = within(nav)
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));
    // The four section links jump to the home page. "Book a demo" is a real page, so it works from anywhere too.
    expect(hrefs).toEqual(["/#how-it-works", "/#features", "/#trust", "/#faq", "/book-demo"]);
  });

  it("scrolls to the top when a link moves to another page", async () => {
    renderAt("/attendance");

    const originalScrollTo = window.scrollTo;
    const calls: Array<[number, number]> = [];
    window.scrollTo = ((x: number, y: number) => {
      calls.push([x, y]);
    }) as typeof window.scrollTo;
    try {
      fireEvent.click(screen.getByRole("link", { name: "AC service" }));
      await screen.findByRole("heading", { level: 1, name: /AC service software/i });
    } finally {
      window.scrollTo = originalScrollTo;
    }

    expect(calls).toContainEqual([0, 0]);
  });

  it("restores the scroll position when navigating back", async () => {
    const router = renderAt("/attendance");

    const originalScrollTo = window.scrollTo;
    const calls: Array<[number, number]> = [];
    window.scrollTo = ((x: number, y: number) => {
      calls.push([x, y]);
    }) as typeof window.scrollTo;
    // ScrollRestoration reads window.scrollY to save the position when a page is left.
    Object.defineProperty(window, "scrollY", { value: 240, configurable: true });
    try {
      fireEvent.click(screen.getByRole("link", { name: "AC service" }));
      await screen.findByRole("heading", { level: 1, name: /AC service software/i });
      await act(async () => {
        await router.navigate(-1);
      });
      await screen.findByRole("heading", { level: 1, name: /without the register/i });
    } finally {
      window.scrollTo = originalScrollTo;
      Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
    }

    // The push to the AC page opened at the top; coming back restored where /attendance was.
    expect(calls).toContainEqual([0, 0]);
    expect(calls).toContainEqual([0, 240]);
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
