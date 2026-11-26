import { Link, useFetcher } from "react-router";
// eslint-disable-next-line no-restricted-imports -- the effect announces the resend outcome through the toast layer once; no server reads here
import { useEffect, useRef, type ComponentType } from "react";
import type { MemberRow } from "../companyApi";
import type { EmployeesActionResult, EmployeesFilters, MembersSort } from "../adminBrowseLoaders";
import { employeesUrl } from "../employeesUrl";
import { CrownIcon, UserIcon, type ConsoleIconProps } from "../../../components/ui/consoleIcons";
import { pushToast } from "../../../components/ui/toastStore";
import { humanize } from "../status";
import { JobSettingsCell } from "./JobSettingsDialog";
import { EmploymentCell } from "./payroll/EmploymentDialog";
import { Avatar } from "./Avatar";
import { fmtPhone } from "../format";
import { resendOutcomeLine } from "../smsOutcome";
import { Spinner } from "../../../components/ui/Spinner";
import styles from "./MembersTable.module.css";

/** Role pills in the console palette: owner violet with the crown, employee
 *  blue with the person, viewer gray. */
const ROLE_PILL: Record<
  string,
  { label: string; tone: string; Icon: ComponentType<ConsoleIconProps> | null }
> = {
  company_admin: { label: "Owner", tone: "violet", Icon: CrownIcon },
  employee: { label: "Employee", tone: "sky", Icon: UserIcon },
  viewer: { label: "Viewer", tone: "neutral", Icon: null },
};

/** The person's photo when one is set; otherwise their initials on the
 *  console's gradient tile — the shared Avatar, fed from the member row. */
function MemberAvatar({ row }: { row: MemberRow }) {
  return <Avatar name={row.name} imageUrl={row.avatarUrl} />;
}

/** The Invited row's resend link: posts intent=resend, then says what
 *  happened to the text on the row itself. */
function ResendCell({ row }: { row: MemberRow }) {
  const fetcher = useFetcher<EmployeesActionResult>();
  const mine =
    fetcher.data?.kind === "resend" && fetcher.data.userId === row.userId ? fetcher.data : null;
  const busy = fetcher.state !== "idle";
  // The row's note dies with its scroll position; the toast layer keeps the
  // resend's outcome visible wherever the person is now (§4). The ref guard
  // keeps one submission announced exactly once — a new resend produces a
  // new fetcher.data object, so it announces again.
  const announced = useRef<EmployeesActionResult | undefined>(undefined);
  useEffect(() => {
    if (mine === null || announced.current === fetcher.data) return;
    announced.current = fetcher.data;
    if (mine.state === "done") {
      pushToast(resendOutcomeLine(mine.smsStatus), "success");
    } else {
      pushToast(mine.message, "error");
    }
  }, [mine, fetcher.data]);
  return (
    <>
      <fetcher.Form method="post" className={styles.resendForm}>
        <input type="hidden" name="intent" value="resend" />
        <input type="hidden" name="userId" value={row.userId} />
        <button
          type="submit"
          className={styles.resendButton}
          disabled={busy}
          aria-busy={busy ? true : undefined}
        >
          {busy ? <Spinner size={12} /> : null}
          {busy ? "Sending…" : "Send Invitation Again"}
        </button>
      </fetcher.Form>
      {mine !== null && mine.state === "done" ? (
        <span className={styles.resendNote} role="status">
          {resendOutcomeLine(mine.smsStatus)}
        </span>
      ) : null}
      {mine !== null && mine.state === "error" ? (
        <p className={styles.resendError} role="alert">
          {mine.message}
        </p>
      ) : null}
    </>
  );
}

/** Each sortable column's ascending and descending sorts. Joined reads
 *  oldest-first as ascending, so newest-first (the default) is descending. */
const SORT_ORDER: Record<"name" | "code" | "joined", { asc: MembersSort; desc: MembersSort }> = {
  name: { asc: "name_az", desc: "name_za" },
  code: { asc: "code_az", desc: "code_za" },
  joined: { asc: "joined_old", desc: "joined_new" },
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
  column: "name" | "code" | "joined";
  sort: MembersSort;
  filters: EmployeesFilters;
}) {
  const { asc, desc } = SORT_ORDER[column];
  const next = sort === asc ? desc : asc;
  // The <th> belongs to the caller; this is only the header's content.
  return (
    <Link to={employeesUrl(filters, { sort: next })} className={styles.sortLink}>
      {label}
      <span className={styles.sortArrows} aria-hidden="true">
        ↑↓
      </span>
    </Link>
  );
}

/** The aria-sort value for a sortable column: the direction when it is the
 *  active sort, "none" otherwise. Newest-first counts as descending. */
function sortStateFor(column: "name" | "code" | "joined", sort: MembersSort) {
  const { asc, desc } = SORT_ORDER[column];
  if (sort === asc) return "ascending" as const;
  if (sort === desc) return "descending" as const;
  return "none" as const;
}

/** The joined date in the design's shape: "Nov 07, 2026" (India time, the
 *  same day boundary the console uses elsewhere). */
const JOINED_DATE = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

function JoinedCell({ row }: { row: MemberRow }) {
  const at = new Date(row.createdAt);
  const invalid = Number.isNaN(at.getTime());
  return (
    <div className={styles.joined}>
      <span className={styles.joinedDay}>{invalid ? row.createdAt : JOINED_DATE.format(at)}</span>
    </div>
  );
}

/**
 * The team table: the person (gradient tile, name, "You", email), their
 * contact, the owner's job-settings column (resend link for invited rows,
 * chip for active employees), the employment dialog's cell (payroll's
 * PAN/DOB/bank form) and sortable Name / Code / Joined columns. The page
 * owns paging and filters; sorting rides the same URL params.
 */
export function MembersTable({
  rows,
  sort,
  filters,
  selfUserId,
}: {
  rows: MemberRow[];
  sort: MembersSort;
  filters: EmployeesFilters;
  selfUserId: string;
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
            <SortHeader label="Name" column="name" sort={sort} filters={filters} />
          </th>
          <th scope="col">Phone Number</th>
          <th
            scope="col"
            aria-sort={sortStateFor("code", sort)}
            className={sort === "code_az" || sort === "code_za" ? styles.sortActive : undefined}
          >
            <SortHeader label="Employee Code" column="code" sort={sort} filters={filters} />
          </th>
          <th scope="col">Role</th>
          <th scope="col">Status</th>
          <th scope="col">Job Settings</th>
          <th scope="col">Employment Details</th>
          <th
            scope="col"
            aria-sort={sortStateFor("joined", sort)}
            className={
              sort === "joined_new" || sort === "joined_old" ? styles.sortActive : undefined
            }
          >
            <SortHeader label="Joined On" column="joined" sort={sort} filters={filters} />
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((m) => {
          const role = ROLE_PILL[m.role] ?? {
            label: humanize(m.role),
            tone: "neutral",
            Icon: null,
          };
          return (
            <tr key={m.userId}>
              <td>
                <div className={styles.nameCell}>
                  <MemberAvatar row={m} />
                  <div className={styles.nameText}>
                    <span className={styles.nameRow}>
                      {/* The name opens the person's profile — the row's
                          quick-edit cells stay for the fast path. */}
                      <Link className={styles.name} to={`/admin/company/employees/${m.userId}`}>
                        {m.name ?? "No Name"}
                      </Link>
                      {m.userId === selfUserId ? <span className={styles.youPill}>You</span> : null}
                    </span>
                    {m.email ? <span className={styles.email}>{m.email}</span> : null}
                  </div>
                </div>
              </td>
              <td className={styles.quiet}>{fmtPhone(m.countryCode, m.phoneNumber)}</td>
              <td>
                <span className={styles.codeTag}>{m.employeeCode}</span>
              </td>
              <td>
                <span className={styles.rolePill} data-role={role.tone}>
                  {role.Icon ? <role.Icon size={13} strokeWidth={2} /> : null}
                  {role.label}
                </span>
              </td>
              <td>
                <span className={styles.statusPill} data-status={m.status}>
                  <span className={styles.statusDot} aria-hidden="true" />
                  {humanize(m.status)}
                </span>
              </td>
              <td>
                {m.status === "invited" ? (
                  <ResendCell row={m} />
                ) : m.role === "employee" && m.status === "active" ? (
                  // The settings write requires an active membership — a
                  // deactivated row shows no live switch that would 404.
                  <JobSettingsCell key={m.userId} row={m} />
                ) : (
                  <span className={styles.quiet}>—</span>
                )}
              </td>
              <td>
                {(m.status === "active" || m.status === "deactivated") && m.role === "employee" ? (
                  <EmploymentCell userId={m.userId} name={m.name} />
                ) : (
                  <span className={styles.quiet}>—</span>
                )}
              </td>
              <td>
                <JoinedCell row={m} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
