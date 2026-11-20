import type { AttendanceFilters } from "./adminBrowseLoaders";

export const ATTENDANCE_PATH = "/admin/company/attendance";

/** The dropdown value for "no office" — an unlikely-to-be-a-real-office
 *  sentinel, so an office literally named "none" stays filterable by name. */
export const ATTENDANCE_NO_OFFICE = "__none__";

/** Builds the attendance page's month-table address for a filter change; a
 *  filter or page-size change always restarts at page 1, and defaults stay
 *  out of the URL, so every link shares one view of the address. The tab
 *  strip's `tab` param is untouched — this helper only ever addresses the
 *  month tab. */
export function attendanceUrl(
  filters: AttendanceFilters,
  changes: Partial<AttendanceFilters>,
): string {
  const next = { ...filters, page: 1, ...changes };
  const params = new URLSearchParams();
  if (next.chip !== "") params.set("chip", next.chip);
  if (next.office !== "") params.set("office", next.office);
  if (next.sort !== "absent") params.set("sort", next.sort);
  if (next.pageSize !== 10) params.set("pageSize", String(next.pageSize));
  if (next.page > 1) params.set("page", String(next.page));
  const query = params.toString();
  return query === "" ? ATTENDANCE_PATH : `${ATTENDANCE_PATH}?${query}`;
}
