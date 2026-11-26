/**
 * The holidays section's tab strip (2026-11-26): the three tabs are three
 * sibling addresses — the calendar (the section's landing), the full list,
 * and the bulk upload — so each keeps its own loader and only the active
 * tab's data is ever fetched. The first tab's value must stay "calendar":
 * Tabs links tab one to the bare basePath unless a full `to` is set, and all
 * three set `to`, so the ordering is just the reading order.
 */
export const HOLIDAY_TABS = [
  { value: "calendar", label: "Calendar", to: "/admin/company/holidays" },
  { value: "list", label: "Full List", to: "/admin/company/holidays/schedule" },
  { value: "upload", label: "Bulk Upload", to: "/admin/company/holidays/upload" },
] as const;
