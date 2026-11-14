import { useLoaderData, useRevalidator } from "react-router";
import type { adminAttendanceLoader } from "../features/admin/adminBrowseLoaders";
import { humanize } from "../features/admin/status";
import { SectionCard } from "../features/admin/components/SectionCard";
import { DataTable, type TableCell } from "../features/admin/components/Table";
import { Tabs } from "../features/admin/components/Tabs";
import { fmtDay } from "../features/admin/format";
import { ReportExportCard } from "../features/admin/ReportExportCard";
import styles from "./AdminAttendancePage.module.css";

const ATTENDANCE_PATH = "/admin/company/attendance";

const ATTENDANCE_TABS = [
  { value: "month", label: "This month" },
  { value: "report", label: "Report" },
];

/** The attendance page, one tab per panel: the running month's table for
 *  every employee, and the attendance report PDF. Only the active tab's
 *  data is fetched — a tab change is navigation (`?tab=`). */
export function AdminAttendancePage() {
  const data = useLoaderData<typeof adminAttendanceLoader>();
  const revalidator = useRevalidator();
  const busy = revalidator.state !== "idle";

  if (data.state === "failed") {
    return (
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
    );
  }

  return (
    <div className={styles.stack}>
      <Tabs basePath={ATTENDANCE_PATH} tabs={ATTENDANCE_TABS} current={data.tab} />
      {data.tab === "month" ? (
        <SectionCard
          title="Attendance this month"
          meta={`${fmtDay(data.from)} – ${fmtDay(data.to)}`}
        >
          <DataTable
            columns={["Employee", "Office", "Worked", "Half days", "Late", "Leave", "Absent"]}
            empty="No employees tracked yet."
            rows={data.rows.map((e): TableCell[] => [
              { text: e.employeeName },
              { text: e.officeName ?? "—" },
              { text: String(e.summary.daysWorked) },
              { text: String(e.summary.halfDays) },
              { text: String(e.summary.lateCount) },
              { text: String(e.summary.leave) },
              { text: String(e.summary.absent), status: e.summary.absent > 0 },
            ])}
          />
          <p className={styles.note}>
            Status words: {humanize("present")} counts in "Worked"; {humanize("absent")} means a
            graded absent day. Missing check-outs are tracked in the overview flags.
          </p>
        </SectionCard>
      ) : null}
      {data.tab === "report" ? (
        <SectionCard title="Attendance report">
          <ReportExportCard
            reportType="attendance_report"
            history={data.history}
            onRetryHistory={() => revalidator.revalidate()}
          />
        </SectionCard>
      ) : null}
    </div>
  );
}
