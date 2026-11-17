import type { CustomersFilters } from "./adminBrowseLoaders";

export const CUSTOMERS_PATH = "/admin/company/customers";

/** Builds the Customers page's address for a filter change; a filter or
 *  page-size change always restarts at page 1, and defaults stay out of the
 *  URL, so every link shares one view of the address. */
export function customersUrl(
  filters: CustomersFilters,
  changes: Partial<CustomersFilters>,
): string {
  const next = { ...filters, page: 1, ...changes };
  const params = new URLSearchParams();
  if (next.q !== "") params.set("q", next.q);
  if (next.bucket !== "all") params.set("bucket", next.bucket);
  if (next.sort !== "created_new") params.set("sort", next.sort);
  if (next.pageSize !== 10) params.set("pageSize", String(next.pageSize));
  if (next.page > 1) params.set("page", String(next.page));
  const query = params.toString();
  return query === "" ? CUSTOMERS_PATH : `${CUSTOMERS_PATH}?${query}`;
}
