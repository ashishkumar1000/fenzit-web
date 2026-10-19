import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { routes } from "./router";

function setOnline(value: boolean): void {
  Object.defineProperty(navigator, "onLine", { value, configurable: true });
}

function renderAt(path: string): void {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
}

afterEach(() => {
  setOnline(true);
  cleanup();
});

describe("router", () => {
  it("renders the home page at /", () => {
    renderAt("/");

    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.queryByText("Page not found")).toBeNull();
  });

  it.each(["/does-not-exist", "/a/b/c", "/index.html", "/HOME"])(
    "renders the not-found page for %s",
    (path) => {
      renderAt(path);

      expect(screen.getByRole("heading", { name: "Page not found" })).toBeInTheDocument();
    },
  );

  it("links from the not-found page back to the home page", () => {
    renderAt("/missing");

    const link = screen.getByRole("link", { name: "Go to home" });
    expect(link).toHaveAttribute("href", "/");

    fireEvent.click(link);

    expect(screen.queryByText("Page not found")).toBeNull();
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
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

    fireEvent.click(screen.getByRole("link", { name: "Go to home" }));

    expect(screen.getByText(/you are offline/i)).toBeInTheDocument();
  });
});
