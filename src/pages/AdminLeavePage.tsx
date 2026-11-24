import { Link, useLoaderData, useNavigate, useRevalidator } from "react-router";
import type {
  adminLeaveLoader,
  LeaveSelection,
  LeaveStatusFilter,
} from "../features/admin/leaveLoaders";
import { LEAVE_STATUSES } from "../features/admin/leaveLoaders";
import { LEAVE_PATH, leaveRequestsUrl } from "../features/admin/leaveUrl";
import type { LeaveRow } from "../features/admin/companyApi";
import { StatusBadge } from "../features/admin/components/Badge";
import { LeaveTypesTab } from "../features/admin/components/LeaveTypesTab";
import { LeaveRequestActions } from "../features/admin/components/LeaveRequestActions";
import { LeaveRequestPanel } from "../features/admin/components/LeaveRequestPanel";
import { LeaveCalendarTab } from "../features/admin/components/LeaveCalendarTab";
import { SectionCard } from "../features/admin/components/SectionCard";
import { Tabs } from "../features/admin/components/Tabs";
import { fmtDay } from "../features/admin/format";
import { humanize } from "../features/admin/status";
import { CrownIcon } from "../components/ui/consoleIcons";
import styles from "./AdminLeavePage.module.css";

const LEAVE_TABS = [
  { value: "types", label: "Types" },
  { value: "requests", label: "Requests" },
  { value: "calendar", label: "Upcoming Leaves" },
];

/** The Leave section, one tab per panel: the fixed leave-type catalog's
 *  values — rate, carry-forward, paid, enabled — the whole company's
 *  requests with the owner's decisions, and the month calendar of approved
 *  time off. Only the active tab's data is fetched — a tab change is
 *  navigation (`?tab=`), a filter or pager change is an address. */
export function AdminLeavePage() {
  const data = useLoaderData<typeof adminLeaveLoader>();
  const revalidator = useRevalidator();
  const busy = revalidator.state !== "idle";

  if (data.state === "failed") {
    return (
      <>
        <TopBar />
        <div className={styles.stack}>
          <Tabs basePath={LEAVE_PATH} tabs={LEAVE_TABS} current={data.tab} />
          <SectionCard title="Leave">
            <p className={styles.failed} role="alert">
              This page could not load.
              <button
                type="button"
                className={styles.retry}
                onClick={() => revalidator.revalidate()}
                disabled={busy}
              >
                {busy ? "Retrying…" : "Try again"}
              </button>
            </p>
          </SectionCard>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar />
      <header className={styles.pageHead}>
        <div>
          <h1 className={styles.heading}>
            {data.selfName === null ? "Hello" : `Hello, ${data.selfName}`}
            <span className={styles.rolePill}>
              <CrownIcon size={13} className={styles.rolePillIcon} />
              Owner
            </span>
          </h1>
          <p className={styles.lede}>
            The leave your team can take, and the requests waiting on you — set each type's rules
            once, decide requests as they come.
          </p>
        </div>
      </header>
      <Tabs basePath={LEAVE_PATH} tabs={LEAVE_TABS} current={data.tab} />
      {data.tab === "types" ? <LeaveTypesTab rows={data.rows} /> : null}
      {data.tab === "calendar" ? (
        // Keyed by the month so a month change remounts the tab — the day
        // modal is component state, and a stale one must not survive the
        // navigation that replaced the grid beneath it.
        <LeaveCalendarTab
          key={data.month}
          month={data.month}
          page={data.page}
          upcoming={data.upcoming}
          upcomingHasMore={data.upcomingHasMore}
          holidays={data.holidays}
          summary={data.summary}
        />
      ) : null}
      {data.tab === "requests" ? (
        <RequestsPanel
          requests={data.page.data}
          status={data.status}
          cursor={data.cursor}
          selected={data.selected}
          selection={data.selection}
          hasMore={data.page.hasMore}
          nextCursor={data.page.nextCursor}
        />
      ) : null}
    </>
  );
}

/** The requests tab: the status chips, the table and the cursor pager, with
 *  the detail panel beside them when a row is selected (`selected=` in the
 *  URL — the loader resolves it, and a selection that is no longer on the
 *  page just closes the panel). A chip or the pager is a plain address — the
 *  loader refetches on navigation, so the table is always the address's
 *  truth. A status change or a page change drops the panel — a selection
 *  belongs to one filtered view of one walk of the list. */
function RequestsPanel({
  requests,
  status,
  cursor,
  selected,
  selection,
  hasMore,
  nextCursor,
}: {
  requests: LeaveRow[];
  status: LeaveStatusFilter;
  cursor: string;
  selected: string;
  selection: LeaveSelection | null;
  hasMore: boolean;
  nextCursor: string | null;
}) {
  const navigate = useNavigate();
  const filters = { status, cursor, selected };
  const closeUrl = leaveRequestsUrl(filters, { selected: "" });
  const chips: Array<{ value: LeaveStatusFilter; label: string }> = [
    { value: "all", label: "All" },
    ...LEAVE_STATUSES.map((value) => ({ value, label: humanize(value) })),
  ];
  return (
    <div className={styles.requestsLayout} data-panel={selection !== null ? "" : undefined}>
      <SectionCard
        title="Requests"
        meta={
          <span className={styles.showing}>
            {status === "all" ? "All requests" : `${humanize(status)} requests`}, newest first
          </span>
        }
        footer={
          requests.length > 0 || hasMore || cursor !== "" ? (
            <div className={styles.tableFooter}>
              <span className={styles.showing}>Up to 20 at a time.</span>
              {cursor !== "" ? (
                <Link
                  className={styles.pagerStep}
                  to={leaveRequestsUrl(filters, { cursor: "", selected: "" })}
                >
                  Start over
                </Link>
              ) : null}
              {hasMore && nextCursor !== null ? (
                <Link
                  className={styles.pagerStep}
                  to={leaveRequestsUrl(filters, { cursor: nextCursor, selected: "" })}
                >
                  Older ›
                </Link>
              ) : null}
            </div>
          ) : null
        }
      >
        <div className={styles.chips} role="group" aria-label="Filter requests by state">
          {chips.map((chip) => (
            <Link
              key={chip.value}
              to={leaveRequestsUrl(filters, { status: chip.value, cursor: "", selected: "" })}
              className={status === chip.value ? styles.chipActive : styles.chip}
              aria-current={status === chip.value ? "true" : undefined}
            >
              {chip.label}
            </Link>
          ))}
        </div>
        {requests.length === 0 ? (
          <p className={styles.empty}>
            {status === "all"
              ? "No leave requests yet. Requests your team applies for appear here."
              : `No ${humanize(status)} requests.`}
          </p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Days</th>
                  <th>State</th>
                  <th>Reason</th>
                  <th>
                    <span className={styles.visuallyHidden}>Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td className={styles.employeeName}>
                      <Link
                        className={styles.detailsLink}
                        to={leaveRequestsUrl(filters, { selected: request.id })}
                        aria-current={selected === request.id ? "true" : undefined}
                      >
                        {request.employeeName ?? request.employeeCode ?? "Unknown"}
                      </Link>
                    </td>
                    <td>
                      {fmtDay(request.startDate)}
                      {request.part !== undefined && request.part !== "full_day" ? (
                        <span className={styles.quiet}> · {humanize(request.part)}</span>
                      ) : null}
                    </td>
                    <td>{fmtDay(request.endDate)}</td>
                    <td>
                      {request.workingDays} of {request.totalDays}
                    </td>
                    <td>
                      <StatusBadge status={request.status} />
                    </td>
                    <td className={styles.reason}>
                      {request.reason === "" ? "—" : request.reason}
                    </td>
                    <td>
                      <LeaveRequestActions request={request} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
      {selection !== null ? (
        <LeaveRequestPanel
          request={selection.request}
          balances={selection.balances}
          closeUrl={closeUrl}
          onClose={() => navigate(closeUrl)}
        />
      ) : null}
    </div>
  );
}

/** The breadcrumb bar: Console › Leave. */
function TopBar() {
  return (
    <div className={styles.topBar}>
      <nav className={styles.crumbs} aria-label="Breadcrumb">
        <Link to="/admin" className={styles.crumbRoot}>
          Console
        </Link>
        <span className={styles.crumbSep} aria-hidden="true">
          ›
        </span>
        <span className={styles.crumbHere} aria-current="page">
          Leave
        </span>
      </nav>
    </div>
  );
}
