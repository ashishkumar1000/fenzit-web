import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ATTENDANCE_PAGE_SIZES, type AttendanceFilters } from "../adminBrowseLoaders";
import { attendanceUrl } from "../attendanceUrl";
import { ConsoleFilterDropdown } from "./ConsoleFilterDropdown";
import styles from "./AttendancePager.module.css";

/** Rows per page: the console dropdown over the house sizes; changing it
 *  restarts at page 1. */
export function RowsPerPage({ filters }: { filters: AttendanceFilters }) {
  const navigate = useNavigate();
  return (
    <ConsoleFilterDropdown
      label="Rows per page"
      valueLabel={String(filters.pageSize)}
      value={String(filters.pageSize)}
      defaultValue="10"
      showSearch={false}
      options={ATTENDANCE_PAGE_SIZES.map((size) => ({ value: String(size), text: String(size) }))}
      searchPlaceholder=""
      apply={(next) => navigate(attendanceUrl(filters, { pageSize: Number(next) }))}
    />
  );
}

/** The pager: first, previous, a window of numbered pages, next, last — each
 *  a plain address, so the address stays the one shareable view of the
 *  table. The rows themselves are filtered and sorted in the browser; the
 *  page slice is the only thing the address pages. */
export function Pager({
  filters,
  page,
  pages,
}: {
  filters: AttendanceFilters;
  page: number;
  pages: number;
}) {
  const navigate = useNavigate();
  const [goTo, setGoTo] = useState("");
  const [goToError, setGoToError] = useState<string | null>(null);
  const from = Math.max(1, Math.min(page - 2, pages - 4));
  const numbers: number[] = [];
  for (let n = from; n <= Math.min(pages, from + 4); n++) numbers.push(n);
  const step = (n: number, label: string, text: string) => (
    <Link className={styles.pagerStep} to={attendanceUrl(filters, { page: n })} aria-label={label}>
      {text}
    </Link>
  );
  return (
    <nav className={styles.pager} aria-label="Pages">
      {page > 1 ? step(1, "First page", "«") : null}
      {page > 1 ? step(page - 1, "Previous page", "‹") : null}
      {from > 1 ? <span className={styles.pagerEllipsis}>…</span> : null}
      {numbers.map((n) => (
        <Link
          key={n}
          className={n === page ? styles.pagerActive : styles.pagerLink}
          to={attendanceUrl(filters, { page: n })}
          aria-current={n === page ? "page" : undefined}
        >
          {n}
        </Link>
      ))}
      {from + 4 < pages ? <span className={styles.pagerEllipsis}>…</span> : null}
      {page < pages ? step(page + 1, "Next page", "›") : null}
      {page < pages ? step(pages, "Last page", "»") : null}
      <form
        className={styles.goTo}
        onSubmit={(event) => {
          event.preventDefault();
          const n = Number(goTo);
          if (goTo !== "" && Number.isInteger(n) && n >= 1 && n <= pages) {
            setGoToError(null);
            setGoTo("");
            navigate(attendanceUrl(filters, { page: n }));
          } else {
            // Keep the typed text so the owner can correct it, and say why.
            setGoToError(`Enter a page from 1 to ${pages}.`);
          }
        }}
      >
        <label className={styles.selectLabel} htmlFor="go-to-attendance-page">
          Go to page:
        </label>
        <input
          id="go-to-attendance-page"
          className={styles.goToInput}
          inputMode="numeric"
          value={goTo}
          onChange={(event) => setGoTo(event.target.value.replace(/\D/g, ""))}
          placeholder={String(page)}
          aria-label="Go to page"
          aria-invalid={goToError !== null}
          aria-describedby={goToError !== null ? "go-to-attendance-page-error" : undefined}
        />
        {goToError !== null ? (
          <span id="go-to-attendance-page-error" className={styles.goToError} role="alert">
            {goToError}
          </span>
        ) : null}
      </form>
    </nav>
  );
}
