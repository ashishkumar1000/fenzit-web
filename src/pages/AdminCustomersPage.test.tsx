import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { routes } from "../app/routes";
import { writeSession } from "../services/session";
import {
  clearApiBase,
  installFetchMock,
  jsonResponse,
  restoreFetchMock,
  sentRequests,
  setRespond,
  useApiBase,
} from "../testing/fetchMock";

// The customers page for the owner (route company/customers): the four
// whole-company tiles, the bucket chips, the sort dropdown and the two empty
// states — a tenant with no customers at all says add the first one, while a
// page past the last one says the filters kept nothing and keeps the pager.
// Every endpoint answers by URL, statelessly — the page reloads them
// wholesale on each navigation.

beforeAll(() => {
  useApiBase();
});

afterAll(() => {
  clearApiBase();
});

let customersAnswer: () => Response;

beforeEach(() => {
  customersAnswer = () =>
    customersEnvelope(seededRows(), 12, { total: 12, new: 5, single: 3, repeat: 4 });
  installFetchMock();
  setRespond(respondDefault);
});

function customerRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "c-1",
    name: "Sharma General Store",
    customerCode: "CST-001",
    countryCode: "+91",
    phoneNumber: "9900000001",
    address: "12 Nehru Road",
    city: "Delhi",
    jobCount: 7,
    lastJobDate: "2026-11-15T09:30:00Z",
    ...overrides,
  };
}

function seededRows(): Record<string, unknown>[] {
  return [
    customerRow(),
    customerRow({
      id: "c-2",
      name: "Meera Khanna",
      customerCode: "CST-002",
      phoneNumber: "9811100011",
      address: null,
      city: null,
      jobCount: 2,
      lastJobDate: null,
    }),
  ];
}

function customersEnvelope(
  rows: Record<string, unknown>[],
  total: number,
  stats: Record<string, number>,
): Response {
  return jsonResponse({
    data: rows,
    total,
    page: 1,
    pageSize: 10,
    pages: Math.max(1, Math.ceil(total / 10)),
    stats: { total: stats.total, new: stats.new, single: stats.single, repeat: stats.repeat },
  });
}

function respondDefault(url: string): Response {
  if (url.endsWith("/users/me")) {
    return jsonResponse({
      id: "u-own",
      role: "company_admin",
      name: "Beta Yela",
      platformAdmin: false,
      email: "beta@example.com",
      countryCode: "+91",
      phoneNumber: "9900000001",
      employeeCode: null,
      status: "active",
    });
  }
  if (url.includes("/customers/page")) return customersAnswer();
  // The add-customer dialog's dial codes: an empty list degrades to the
  // India fallback.
  if (url.includes("/country-codes")) return jsonResponse([]);
  throw new TypeError(`offline in tests: ${url}`);
}

afterEach(() => {
  restoreFetchMock();
  window.localStorage.clear();
  window.sessionStorage.clear();
  cleanup();
});

function renderCustomers(entry = "/admin/company/customers"): void {
  const router = createMemoryRouter(routes, { initialEntries: [entry] });
  render(<RouterProvider router={router} />);
}

/** A second render in the same file must clean up first — the helper keeps
 *  the navigation entry honest for follow-up renders in one test. */
function renderCustomersAt2(path: string): void {
  cleanup();
  renderCustomers(path);
}

/** One console tile, found by its label; the value lives under the same
 *  tile's root. The label is the tile's <p> — the same words also name a
 *  bucket chip's link, so the paragraph is the tile's. */
function customerTile(label: string): HTMLElement {
  const labelP = screen.getAllByText(label).find((el) => el.tagName === "P");
  const head = labelP?.closest("div") ?? null;
  const root = head?.parentElement ?? null;
  if (labelP === undefined || head === null || root === null) {
    throw new Error(`no tile labelled ${label}`);
  }
  return root;
}

describe("AdminCustomersPage: the owner's customers page", () => {
  it("shows the four tiles with the whole-company counts from the seeded payload", async () => {
    writeSession({ token: "tok-1", name: "Beta" });
    renderCustomers();
    expect(await screen.findByText("Sharma General Store")).toBeTruthy();
    expect(screen.getByText("Meera Khanna")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Hello, Beta Yela");
    for (const [label, value] of [
      ["Total Customers", "12"],
      ["New Customers", "5"],
      ["One Job", "3"],
      ["Repeat Customers", "4"],
    ] as const) {
      expect(within(customerTile(label)).getByText(value)).toBeTruthy();
    }
    // The chips carry the same disjoint split as the tiles.
    const group = screen.getByRole("group", { name: "Filter customers by jobs" });
    expect(group.textContent).toContain("All12");
    expect(group.textContent).toContain("New5");
    expect(group.textContent).toContain("One Job3");
    expect(group.textContent).toContain("Repeat Customers4");
    // The two seeded rows read as their own counts, even on a 12-customer book.
    expect(screen.getByText("Showing 1 to 10 of 12 customers")).toBeTruthy();
  });

  it("the sort dropdown offers the five orders and applies one to the address", async () => {
    writeSession({ token: "tok-1", name: "Beta" });
    renderCustomers();
    await screen.findByText("Sharma General Store");
    fireEvent.click(screen.getByRole("button", { name: "Sort By: Newest Added" }));
    const panel = screen.getByRole("listbox", { name: "Sort By" });
    for (const word of [
      "Newest Added",
      "Oldest Added",
      "Name (A to Z)",
      "Name (Z to A)",
      "Recently Active",
    ]) {
      expect(within(panel).getByText(word)).toBeTruthy();
    }
    fireEvent.click(within(panel).getByText("Name (A to Z)"));
    fireEvent.click(within(panel).getByRole("button", { name: "Apply" }));
    await waitFor(() => {
      const paged = sentRequests().filter((r) => r.url.includes("/customers/page"));
      expect(paged.some((r) => new URL(r.url).searchParams.get("sort") === "name_az")).toBe(true);
    });
  });

  it("an empty tenant says add the first customer; a page past the last says change the filters", async () => {
    writeSession({ token: "tok-1", name: "Beta" });
    customersAnswer = () => customersEnvelope([], 0, { total: 0, new: 0, single: 0, repeat: 0 });
    renderCustomers();
    expect(
      await screen.findByText(
        "No customers added yet. Add your first customer, or create a job for someone. Their details will be saved automatically.",
      ),
    ).toBeTruthy();
    // Nothing to page through when the book itself is empty.
    expect(screen.queryByLabelText("Pages")).toBeNull();

    // A page past the last one: the book has customers, this view has none.
    customersAnswer = () => customersEnvelope([], 8, { total: 8, new: 2, single: 2, repeat: 4 });
    renderCustomersAt2("/admin/company/customers?page=9");
    expect(
      await screen.findByText("No customers found. Try changing your search or filters."),
    ).toBeTruthy();
    // The pager stays: the owner may want to go back to page 1.
    expect(screen.getByLabelText("Pages")).toBeTruthy();

    // A search that matches nothing in a company that HAS customers reads the
    // same way — never "add your first customer" to an owner who has eight.
    customersAnswer = () => customersEnvelope([], 0, { total: 8, new: 2, single: 2, repeat: 4 });
    renderCustomersAt2("/admin/company/customers?search=zzz");
    expect(
      await screen.findByText("No customers found. Try changing your search or filters."),
    ).toBeTruthy();
  });
});
