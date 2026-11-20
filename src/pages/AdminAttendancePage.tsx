import { Link, useLoaderData, useLocation, useRevalidator } from "react-router";
import type {
  adminAttendanceLoader,
  AttendanceData,
  AttendanceFilters,
} from "../features/admin/adminBrowseLoaders";
import { readAttendanceFilters } from "../features/admin/adminBrowseLoaders";
import { ATTENDANCE_PATH, ATTENDANCE_NO_OFFICE } from "../features/admin/attendanceUrl";
import { humanize } from "../features/admin/status";
import { SectionCard } from "../features/admin/components/SectionCard";
import { Tabs } from "../features/admin/components/Tabs";
import { fmtDay } from "../features/admin/format";
import { ReportExportCard } from "../features/admin/ReportExportCard";
import { ConsoleTiles, type ConsoleTile } from "../features/admin/components/ConsoleTiles";
import { ExportAttendanceButton } from "../features/admin/components/AttendanceExport";
import {
  AttendanceChips,
  ClearAllButton,
  OfficeDropdown,
  SortDropdown,
} from "../features/admin/components/AttendanceFilterBar";
import { Pager, RowsPerPage } from "../features/admin/components/AttendancePager";
import { Avatar } from "../features/admin/components/Avatar";
import {
  ApprovalTagIcon,
  BellIcon,
  CrownIcon,
  UserCheckIcon,
  UsersIcon,
} from "../components/ui/consoleIcons";
import styles from "./AdminAttendancePage.module.css";

const ATTENDANCE_TABS = [
  { value: "month", label: "This month" },
  { value: "report", label: "Report" },
];

/** The attendance page, one tab per panel: the running month's tallies for
 *  every employee — chips, office filter, sort and pager all in the browser
 *  (the roster arrives whole and the monthly endpoint is expensive) — and
 *  the attendance report PDF, which already scopes offices and keeps its own
 *  history. Only the active tab's data is fetched — a tab change is
 *  navigation (`?tab=`), a filter change is an address the route's
 *  shouldRevalidate serves without a refetch. */
export function AdminAttendancePage() {
  const data = useLoaderData<typeof adminAttendanceLoader>();
  const revalidator = useRevalidator();
  const busy = revalidator.state !== "idle";
  // The month table's filters are read from the address on every render, not
  // from loader data — a filter navigation revalidates nothing, so this is
  // what keeps the table honest with the URL.
  const filters = readAttendanceFilters(new URLSearchParams(useLocation().search));

  if (data.state === "failed") {
    return (
      <>
        <TopBar />
        <div className={styles.stack}>
          <Tabs basePath={ATTENDANCE_PATH} tabs={ATTENDANCE_TABS} current={data.tab} />
          <SectionCard title="Attendance">
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
            Who worked, who was late and who was away — the month's tallies for every office, and
            the compliance report when you need it.
          </p>
        </div>
        <div className={styles.pageActions}>
          {data.state === "ok" && data.tab === "month" ? (
            <ExportAttendanceButton rows={data.rows} />
          ) : null}
        </div>
      </header>
      <Tabs basePath={ATTENDANCE_PATH} tabs={ATTENDANCE_TABS} current={data.tab} />
      {data.state === "ok" && data.tab === "month" ? (
        <MonthPanel data={data} filters={filters} />
      ) : null}
      {data.state === "ok" && data.tab === "report" ? (
        <SectionCard title="Attendance report">
          <ReportExportCard
            reportType="attendance_report"
            history={data.history}
            onRetryHistory={() => revalidator.revalidate()}
          />
        </SectionCard>
      ) : null}
    </>
  );
}

/** The month tab: the four tally tiles, the filter strip and the paged
 *  table. Everything derives from the one roster the loader fetched. */
function MonthPanel({
  data,
  filters,
}: {
  data: Extract<AttendanceData, { state: "ok"; tab: "month" }>;
  filters: AttendanceFilters;
}) {
  const rows = data.rows;
  // The tiles' whole-roster sums — they do not move as the filters change.
  const totals = rows.reduce(
    (acc, e) => ({
      worked: acc.worked + e.summary.daysWorked,
      half: acc.half + e.summary.halfDays,
      late: acc.late + e.summary.lateCount,
      leave: acc.leave + e.summary.leave,
      absent: acc.absent + e.summary.absent,
    }),
    { worked: 0, half: 0, late: 0, leave: 0, absent: 0 },
  );

  const tiles: ConsoleTile[] = [
    {
      label: "Worked days",
      value: totals.worked,
      icon: UserCheckIcon,
      tone: "done",
      sub: "Days worked across everyone this month",
    },
    {
      label: "Half days & late",
      value: totals.half + totals.late,
      icon: BellIcon,
      tone: "scheduled",
      sub: `${totals.half} half days · ${totals.late} late arrivals`,
    },
    {
      label: "On approved leave",
      value: totals.leave,
      icon: ApprovalTagIcon,
      tone: "violet",
      sub: "Days covered by approved leave",
    },
    {
      label: "Absent graded",
      value: totals.absent,
      icon: UsersIcon,
      tone: "primary",
      sub: "Graded absent days this month",
    },
  ];

  // The office name as the filter sees it: trimmed, and blank after trimming
  // means no office. The table keeps displaying the raw string; the filter
  // compares normalized, so a padded or empty officeName still behaves.
  const officeOf = (e: { officeName: string | null }): string | null => {
    const name = e.officeName?.trim();
    return name ? name : null;
  };
  // The offices the roster actually names, alphabetically — the filter's
  // option set. Employees with no office filter under "No office".
  const offices = Array.from(
    new Set(rows.map(officeOf).filter((name): name is string => name !== null)),
  ).sort((a, b) => a.localeCompare(b));

  // ── The chips' whole-roster counts ──────────────────────────────────────
  const counts = {
    all: rows.length,
    present: rows.filter((e) => e.summary.daysWorked > 0).length,
    late: rows.filter((e) => e.summary.lateCount > 0).length,
    absent: rows.filter((e) => e.summary.absent > 0).length,
  };

  // ── Filter, sort, page — the browser's work ─────────────────────────────
  const filtered = rows.filter((e) => {
    if (filters.chip === "present" && e.summary.daysWorked === 0) return false;
    if (filters.chip === "late" && e.summary.lateCount === 0) return false;
    if (filters.chip === "absent" && e.summary.absent === 0) return false;
    if (filters.office === ATTENDANCE_NO_OFFICE && officeOf(e) !== null) return false;
    if (
      filters.office !== "" &&
      filters.office !== ATTENDANCE_NO_OFFICE &&
      officeOf(e) !== filters.office
    ) {
      return false;
    }
    return true;
  });
  const sorted = [...filtered].sort((a, b) => {
    if (filters.sort === "az") return a.employeeName.localeCompare(b.employeeName);
    // Most absent first, late arrivals breaking the tie, then the name.
    if (b.summary.absent !== a.summary.absent) return b.summary.absent - a.summary.absent;
    if (b.summary.lateCount !== a.summary.lateCount)
      return b.summary.lateCount - a.summary.lateCount;
    return a.employeeName.localeCompare(b.employeeName);
  });
  const pages = Math.max(1, Math.ceil(sorted.length / filters.pageSize));
  const page = Math.min(filters.page, pages);
  const pageRows = sorted.slice((page - 1) * filters.pageSize, page * filters.pageSize);
  const from = sorted.length === 0 ? 0 : (page - 1) * filters.pageSize + 1;
  const to = Math.min(page * filters.pageSize, sorted.length);

  return (
    <>
      <ConsoleTiles tiles={tiles} />
      <SectionCard title="Attendance this month" meta={`${fmtDay(data.from)} – ${fmtDay(data.to)}`}>
        <div className={styles.filterBar}>
          <AttendanceChips filters={filters} counts={counts} />
          <div className={styles.filterControls}>
            <ClearAllButton filters={filters} />
            <OfficeDropdown filters={filters} offices={offices} />
            <SortDropdown filters={filters} />
          </div>
        </div>
        {sorted.length === 0 ? (
          <p className={styles.empty}>
            {rows.length === 0
              ? "No employees tracked yet."
              : "No employees match these filters, or this page is past the last one."}
          </p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Employee</th>
                  <th scope="col">Office</th>
                  <th scope="col">Worked</th>
                  <th scope="col">Half days</th>
                  <th scope="col">Late</th>
                  <th scope="col">Leave</th>
                  <th scope="col">Absent</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((e) => (
                  <tr key={e.employeeId}>
                    <td>
                      <div className={styles.employeeCell}>
                        <Avatar name={e.employeeName} />
                        <span className={styles.employeeName}>{e.employeeName}</span>
                      </div>
                    </td>
                    <td className={styles.quiet}>{officeOf(e) ?? "—"}</td>
                    <td className={styles.worked}>{e.summary.daysWorked}</td>
                    <td className={styles.quiet}>{e.summary.halfDays}</td>
                    <td className={e.summary.lateCount > 0 ? styles.late : styles.quiet}>
                      {e.summary.lateCount}
                    </td>
                    <td className={styles.quiet}>{e.summary.leave}</td>
                    <td className={e.summary.absent > 0 ? styles.absent : styles.quiet}>
                      {e.summary.absent}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {sorted.length > 0 ? (
          <footer className={styles.tableFooter}>
            <p className={styles.showing}>
              Showing {from}–{to} of {sorted.length}{" "}
              {sorted.length === 1 ? "employee" : "employees"}
            </p>
            <RowsPerPage filters={filters} />
            <Pager filters={filters} page={page} pages={pages} />
          </footer>
        ) : rows.length > 0 ? (
          <footer className={styles.tableFooter}>
            <RowsPerPage filters={filters} />
            <Pager filters={filters} page={page} pages={pages} />
          </footer>
        ) : null}
        <p className={styles.note}>
          Status words: {humanize("present")} counts in "Worked"; {humanize("absent")} means a
          graded absent day. Missing check-outs are tracked in the overview flags.
        </p>
      </SectionCard>
    </>
  );
}

/** The page's top bar: the breadcrumb. The export action lives in the
 *  greeting block; the report is the Report tab's card. */
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
          Attendance
        </span>
      </nav>
    </div>
  );
}
