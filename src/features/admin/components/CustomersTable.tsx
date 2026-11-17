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

/** Each sortable column's ascending and descending sorts. Added reads
 *  oldest-first as ascending, so newest-first (the default) is descending;
 *  "recent activity" is the descending arm of the activity pair. */
const SORT_ORDER: Record<"name" | "activity", { asc: CustomersSort; desc: CustomersSort }> = {
  name: { asc: "name_az", desc: "name_za" },
  activity: { asc: "created_new", desc: "recent_activity" },
};

/** One sortable column header: the column name, then the toggle. The active
 *  sort reads in the accent colour; the <th> carries aria-sort. */
function SortHeader({
  label,
  column,
  sort,
  filters,
}: {
  label: string;
  column: "name" | "activity";
  sort: CustomersSort;
  filters: CustomersFilters;
}) {
  const { asc, desc } = SORT_ORDER[column];
  const next = sort === asc ? desc : asc;
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
 *  active sort, "none" otherwise. Newest-first counts as descending. */
function sortStateFor(column: "name" | "activity", sort: CustomersSort) {
  const { asc, desc } = SORT_ORDER[column];
  if (sort === asc) return "ascending" as const;
  if (sort === desc) return "descending" as const;
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
          navigator.clipboard
            .writeText(full)
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
      {!invalid ? (
        <span className={styles.activityTime}>{ACTIVITY_TIME.format(when)}</span>
      ) : null}
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
            <SortHeader label="Customer name" column="name" sort={sort} filters={filters} />
          </th>
          <th scope="col">Phone</th>
          <th scope="col">Address</th>
          <th scope="col">Jobs</th>
          <th
            scope="col"
            aria-sort={sortStateFor("activity", sort)}
            className={
              sort === "recent_activity" || sort === "created_new" ? styles.sortActive : undefined
            }
          >
            <SortHeader label="Last job activity" column="activity" sort={sort} filters={filters} />
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
                    {c.jobCount >= VIP_JOBS ? (
                      <span className={styles.vipPill}>VIP</span>
                    ) : null}
                  </span>
                  <span className={styles.codeTag}>{c.customerCode}</span>
                </div>
              </div>
            </td>
            <td>
              <CopyPhone countryCode={c.countryCode} phoneNumber={c.phoneNumber} />
            </td>
            <td className={styles.quiet}>
              {c.address ?? "—"}
            </td>
            <td>
              <span className={styles.jobsChip} data-hot={c.jobCount >= VIP_JOBS || undefined}>
                {c.jobCount} {c.jobCount === 1 ? "job" : "jobs"}
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
