import { useLoaderData } from "react-router";
import type { adminAttendanceLoader } from "../features/admin/adminBrowseLoaders";
import { humanize } from "../features/admin/status";
import { SectionCard } from "../features/admin/components/SectionCard";
import { DataTable, type TableCell } from "../features/admin/components/Table";
import { fmtDay } from "../features/admin/format";
import styles from "./AdminAttendancePage.module.css";

/** The running month's attendance for every employee, from the monthly
 *  summary endpoint — worked, late, leave and absents at a glance. */
export function AdminAttendancePage() {
  const data = useLoaderData<typeof adminAttendanceLoader>();

  if (data.state === "failed") {
    return (
      <SectionCard title="Attendance">
        <p className={styles.failed} role="alert">
          The month summary could not load. Use the sidebar to retry this page.
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Attendance this month" meta={`${fmtDay(data.from)} – ${fmtDay(data.to)}`}>
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
        Status words: {humanize("present")} counts in "Worked"; {humanize("absent")} means a graded
        absent day. Missing check-outs are tracked in the overview flags.
      </p>
    </SectionCard>
  );
}
