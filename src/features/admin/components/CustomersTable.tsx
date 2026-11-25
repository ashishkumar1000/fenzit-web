import { useState } from "react";
import { Link } from "react-router";
import type { CustomerRow } from "../companyApi";
import type { CustomersFilters, CustomersSort } from "../adminBrowseLoaders";
import { customersUrl } from "../customersUrl";
import { Avatar } from "./Avatar";
import { fmtPhone } from "../format";
import styles from "./CustomersTable.module.css";

/** A repeat customer — the design's VIP badge sits beside their name. */
const VIP_JOBS = 10;

/** The next sort when a header is clicked. Name is a true two-direction
 *  pair (A→Z, Z→A). Activity has only one direction on the backend — most
 *  recent job first — so its click turns that sort on, then off again,
 *  back to the page's default order. */
const NEXT_SORT: Record<"name" | "activity", (sort: CustomersSort) => CustomersSort> = {
  name: (sort) => (sort === "name_az" ? "name_za" : "name_az"),
  activity: (sort) => (sort === "recent_activity" ? "created_new" : "recent_activity"),
};

/** One sortable column header: the column name, then the toggle. The active
 *  sort reads in the accent colour; the <th> carries aria-sort. */
function SortHeader({
  label,
  next,
  filters,
}: {
  label: string;
  next: CustomersSort;
  filters: CustomersFilters;
}) {
  return (
    <Link to={customersUrl(filters, { sort: next })} className={styles.sortLink}>
      {label}
      <span className={styles.sortArrows} aria-hidden="true">
        ↑↓
      </span>
    </Link>
  );
}

/** The aria-sort value for a sortable column: the direction when it is the
 *  active sort, "none" otherwise. Newest-first counts as descending, and
 *  the default order (newest added) sorts no visible column, so no header
 *  claims it. */
function sortStateFor(column: "name" | "activity", sort: CustomersSort) {
  if (column === "name") {
    if (sort === "name_az") return "ascending" as const;
    if (sort === "name_za") return "descending" as const;
  } else if (sort === "recent_activity") {
    return "descending" as const;
  }
  return "none" as const;
}

/** Phone with a one-tap copy: the number is the thing the owner pastes into
 *  a message, so copying it beats selecting text. */
function CopyPhone({ countryCode, phoneNumber }: { countryCode: string; phoneNumber: string }) {
  const [copied, setCopied] = useState(false);
  const full = `${countryCode} ${phoneNumber}`;
  return (
    <span className={styles.phoneWrap}>
      <span className={styles.quiet}>{fmtPhone(countryCode, phoneNumber)}</span>
      <button
        type="button"
        className={styles.copyButton}
        aria-label={`Copy phone number ${full}`}
        onClick={() => {
          // A non-secure origin (LAN testing) exposes no clipboard API — the
          // click must never throw, so it quietly does nothing there.
          navigator.clipboard
            ?.writeText(full)
            .then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            })
            .catch(() => setCopied(false));
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </span>
  );
}

/** The last job's stamp in the design's two-line shape: the day, then the
 *  time under it (India time — the console's shared day boundary). */
const ACTIVITY_DAY = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});
const ACTIVITY_TIME = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

function ActivityCell({ at }: { at: string | null }) {
  if (at === null) return <span className={styles.quiet}>—</span>;
  const when = new Date(at);
  const invalid = Number.isNaN(when.getTime());
  return (
    <div className={styles.activity}>
      <span className={styles.activityDay}>{invalid ? at : ACTIVITY_DAY.format(when)}</span>
      {!invalid ? <span className={styles.activityTime}>{ACTIVITY_TIME.format(when)}</span> : null}
    </div>
  );
}

/**
 * The customer table: the person (gradient tile, name, code caption, VIP
 * badge), their phone with copy, their address, and the job counts. The page
 * owns paging and filters; sorting rides the same URL params.
 */
export function CustomersTable({
  rows,
  sort,
  filters,
}: {
  rows: CustomerRow[];
  sort: CustomersSort;
  filters: CustomersFilters;
}) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th
            scope="col"
            aria-sort={sortStateFor("name", sort)}
            className={sort === "name_az" || sort === "name_za" ? styles.sortActive : undefined}
          >
            <SortHeader label="Customer Name" next={NEXT_SORT.name(sort)} filters={filters} />
          </th>
          <th scope="col">Phone Number</th>
          <th scope="col">Address</th>
          <th scope="col">Total Jobs</th>
          <th
            scope="col"
            aria-sort={sortStateFor("activity", sort)}
            className={sort === "recent_activity" ? styles.sortActive : undefined}
          >
            <SortHeader label="Last Job Date" next={NEXT_SORT.activity(sort)} filters={filters} />
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((c) => (
          <tr key={c.id}>
            <td>
              <div className={styles.nameCell}>
                <Avatar name={c.name} />
                <div className={styles.nameText}>
                  <span className={styles.nameRow}>
                    <span className={styles.name}>{c.name}</span>
                    {c.jobCount >= VIP_JOBS ? <span className={styles.vipPill}>VIP</span> : null}
                  </span>
                  <span className={styles.codeTag}>{c.customerCode}</span>
                </div>
              </div>
            </td>
            <td>
              <CopyPhone countryCode={c.countryCode} phoneNumber={c.phoneNumber} />
            </td>
            <td className={styles.quiet}>{c.address ?? "—"}</td>
            <td>
              <span className={styles.jobsChip} data-hot={c.jobCount >= VIP_JOBS || undefined}>
                {c.jobCount} {c.jobCount === 1 ? "Job" : "Jobs"}
              </span>
            </td>
            <td>
              <ActivityCell at={c.lastJobDate} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
