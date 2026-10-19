import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { router } from "./app/router";
import "./styles/fonts.css";
import "./styles/tokens.css";
import "./styles/global.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root is missing from index.html");
}

const app = (
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);

// The build writes the page's HTML into #root. Hydrate that markup. Render from scratch when
// there is none: the dev server, and the 404 shell that unknown URLs get.
if (rootElement.hasChildNodes()) {
  hydrateRoot(rootElement, app);
} else {
  createRoot(rootElement).render(app);
}
