import type { EmployeesFilters } from "./adminBrowseLoaders";

export const EMPLOYEES_PATH = "/admin/company/employees";

/** Builds the Employees page's address for a filter change; a filter or
 *  page-size change always restarts at page 1, and defaults stay out of the
 *  URL, so every link shares one view of the address. */
export function employeesUrl(
  filters: EmployeesFilters,
  changes: Partial<EmployeesFilters>,
): string {
  const next = { ...filters, page: 1, ...changes };
  const params = new URLSearchParams();
  if (next.q !== "") params.set("q", next.q);
  if (next.status !== "all") params.set("status", next.status);
  if (next.role !== "all") params.set("role", next.role);
  if (next.jobSetting !== "all") params.set("jobSetting", next.jobSetting);
  if (next.sort !== "joined_new") params.set("sort", next.sort);
  if (next.pageSize !== 10) params.set("pageSize", String(next.pageSize));
  if (next.page > 1) params.set("page", String(next.page));
  const query = params.toString();
  return query === "" ? EMPLOYEES_PATH : `${EMPLOYEES_PATH}?${query}`;
}
