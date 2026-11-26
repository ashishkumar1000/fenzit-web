import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "bun:test";
import { MemoryRouter } from "react-router";
import { AdminBootFallback } from "./AdminBootFallback";

// The root fallback renders inside the router's location context, exactly as
// it sits in the route table. On /admin it hosts the full-page Pour loader
// with the boot label; anywhere else it renders nothing, so the
// pre-rendered public pages hydrate without a loader flash.
describe("AdminBootFallback", () => {
  it("hosts the boot loader with its status on /admin", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/admin/company/jobs"]}>
        <AdminBootFallback />
      </MemoryRouter>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Checking your access…");
    // The loader is the mark alone — no wordmark text (owner 2026-11-26).
    expect(screen.queryByText("Fenzit")).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("renders nothing on a public path", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/pricing"]}>
        <AdminBootFallback />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("status")).toBeNull();
    expect(container.querySelector("svg")).toBeNull();
  });

  it("renders nothing on a public path that merely starts with the same letters", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/administrator-guide"]}>
        <AdminBootFallback />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("status")).toBeNull();
    expect(container.querySelector("svg")).toBeNull();
  });
});
