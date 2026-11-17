import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { CUSTOMERS_PAGE_SIZES, type CustomersFilters } from "../adminBrowseLoaders";
import { customersUrl } from "../customersUrl";
import { ConsoleFilterDropdown } from "./ConsoleFilterDropdown";
import styles from "./CustomersPager.module.css";

/** Rows per page: the console dropdown over the sizes the backend accepts;
 *  changing it restarts at page 1. */
export function RowsPerPage({ filters }: { filters: CustomersFilters }) {
  const navigate = useNavigate();
  return (
    <ConsoleFilterDropdown
      label="Rows per page"
      valueLabel={String(filters.pageSize)}
      value={String(filters.pageSize)}
      defaultValue="10"
      showSearch={false}
      options={CUSTOMERS_PAGE_SIZES.map((size) => ({ value: String(size), text: String(size) }))}
      searchPlaceholder=""
      apply={(next) => navigate(customersUrl(filters, { pageSize: Number(next) }))}
    />
  );
}

/** The pager: first, previous, a window of numbered pages, next, last — each
 *  a plain address, so the loader refetches on navigation. */
export function Pager({
  filters,
  page,
  pages,
}: {
  filters: CustomersFilters;
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
    <Link className={styles.pagerStep} to={customersUrl(filters, { page: n })} aria-label={label}>
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
          to={customersUrl(filters, { page: n })}
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
            navigate(customersUrl(filters, { page: n }));
          } else {
            // Keep the typed text so the owner can correct it, and say why.
            setGoToError(`Enter a page from 1 to ${pages}.`);
          }
        }}
      >
        <label className={styles.selectLabel} htmlFor="go-to-customers-page">
          Go to page:
        </label>
        <input
          id="go-to-customers-page"
          className={styles.goToInput}
          inputMode="numeric"
          value={goTo}
          onChange={(event) => setGoTo(event.target.value.replace(/\D/g, ""))}
          placeholder={String(page)}
          aria-label="Go to page"
          aria-invalid={goToError !== null}
          aria-describedby={goToError !== null ? "go-to-customers-page-error" : undefined}
        />
        {goToError !== null ? (
          <span id="go-to-customers-page-error" className={styles.goToError} role="alert">
            {goToError}
          </span>
        ) : null}
      </form>
    </nav>
  );
}
