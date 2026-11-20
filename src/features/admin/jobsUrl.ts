import type { JobsFilters } from "./adminBrowseLoaders";

export const JOBS_PATH = "/admin/company/jobs";

/** Builds the Jobs page's owner-list address for a filter change; a filter or
 *  page-size change always restarts at page 1, and defaults stay out of the
 *  URL, so every link shares one view of the address. The tab strip's params
 *  (tab, the approval queue's deep links) are untouched — this helper only
 *  ever addresses the owner's Jobs tab. */
export function jobsUrl(filters: JobsFilters, changes: Partial<JobsFilters>): string {
  const next = { ...filters, page: 1, ...changes };
  const params = new URLSearchParams();
  if (next.q !== "") params.set("q", next.q);
  if (next.status !== "") params.set("status", next.status);
  if (next.skill !== "") params.set("skill", next.skill);
  if (next.priority !== "") params.set("priority", next.priority);
  if (next.sort !== "latest") params.set("sort", next.sort);
  if (next.pageSize !== 10) params.set("pageSize", String(next.pageSize));
  if (next.page > 1) params.set("page", String(next.page));
  const query = params.toString();
  return query === "" ? JOBS_PATH : `${JOBS_PATH}?${query}`;
}
