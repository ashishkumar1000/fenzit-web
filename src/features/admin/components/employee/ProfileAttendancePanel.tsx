import { Link } from "react-router";
import type { PunchRow } from "../../employeeProfileApi";
import type { EnrolmentRow, OfficeDetail } from "../../employeeProfileApi";
import type { Slice } from "../../slice";
import { DataTable, type TableCell } from "../Table";
import { SectionCard } from "../SectionCard";
import { fmtDay, fmtDistance, istToday } from "../../format";
import styles from "./ProfileAttendancePanel.module.css";

/**
 * The profile's Attendance tab: the office assignment and its shift rules
 * (the enrolment the employee is tracked under), then the month's punch
 * history from the same grid the attendance pages read. The month nav is
 * plain navigation — the loader re-reads the address's `?month=`.
 */

function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

const MONTH_LABEL = new Intl.DateTimeFormat("en-IN", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function ProfileAttendancePanel({
  memberName,
  basePath,
  month,
  enrolment,
  office,
  punches,
}: {
  memberName: string;
  basePath: string;
  month: string;
  enrolment: Slice<EnrolmentRow | null>;
  office: Slice<OfficeDetail | null>;
  punches: Slice<PunchRow[]>;
}) {
  const assigned = enrolment.ok ? enrolment.data : null;
  const rules = office.ok && office.data !== null ? currentRule(office.data) : null;
  return (
    <div className={styles.stack}>
      <div className={styles.topRow}>
        <SectionCard title="Assigned Office" meta="Office location and attendance area.">
          {!enrolment.ok ? (
            <p className={styles.failed} role="alert">
              We could not load the office details. Please try opening this page again.
            </p>
          ) : assigned === null ? (
            <p className={styles.empty}>Attendance is not set up for this employee yet.</p>
          ) : (
            <>
              <p className={styles.officeName}>{assigned.officeName ?? "—"}</p>
              {office.ok && office.data !== null ? (
                <>
                  <p className={styles.address}>
                    {office.data.formattedAddress ?? "Address not added."}
                  </p>
                  <p className={styles.radiusChip}>
                    {office.data.radiusM} metres around the office.
                  </p>
                </>
              ) : null}
              <p className={styles.since}>
                {assigned.attendanceStartDate !== null
                  ? `Assigned From: ${fmtDay(assigned.attendanceStartDate)}`
                  : "Assignment date not available."}
              </p>
            </>
          )}
        </SectionCard>
        <SectionCard
          title="Work Timings"
          meta="These settings decide whether the employee has completed a full day, half day or arrived late."
        >
          {rules !== null ? (
            <dl className={styles.rules}>
              <div className={styles.ruleRow}>
                <dt>Start Time</dt>
                <dd>{rules.startTime}</dd>
              </div>
              <div className={styles.ruleRow}>
                <dt>End Time</dt>
                <dd>{rules.endTime}</dd>
              </div>
              <div className={styles.ruleRow}>
                <dt>Late After</dt>
                <dd>{rules.lateCutoffMinutes} minutes</dd>
              </div>
              <div className={styles.ruleRow}>
                <dt>Full Day Hours</dt>
                <dd>{rules.fullDayHours} hours</dd>
              </div>
              <div className={styles.ruleRow}>
                <dt>Half Day Hours</dt>
                <dd>{rules.halfDayHours} hours</dd>
              </div>
            </dl>
          ) : (
            <p className={styles.empty}>
              {/* Only a settled not-enrolled enrolment says "not set up" —
                  a failed fetch is this card's failure line. */}
              {enrolment.ok && enrolment.data === null
                ? "No work timings have been set because this employee is not enrolled for attendance."
                : "We could not load the work timings."}
            </p>
          )}
        </SectionCard>
      </div>
      <SectionCard
        title="Attendance History"
        meta={MONTH_LABEL.format(new Date(`${month}-01T00:00:00Z`))}
        footer={
          <nav className={styles.monthNav} aria-label="Month">
            <Link
              to={`${basePath}?tab=attendance&month=${shiftMonth(month, -1)}`}
              className={styles.monthLink}
            >
              ‹ Previous Month
            </Link>
            <Link
              to={`${basePath}?tab=attendance&month=${shiftMonth(month, 1)}`}
              className={styles.monthLink}
            >
              Next Month ›
            </Link>
          </nav>
        }
      >
        {!punches.ok ? (
          <p className={styles.failed} role="alert">
            We could not load the attendance history. Please go back to the menu and open this page
            again.
          </p>
        ) : (
          <DataTable
            columns={[
              "Date",
              "Check-in Time",
              "Check-out Time",
              "Distance at Check-in",
              "Distance at Check-out",
              "Status",
            ]}
            rows={punchRows(punches.data)}
            empty={`Attendance details will appear here once ${memberName} checks in${assigned?.officeName != null ? ` at ${assigned.officeName}` : ""}.`}
          />
        )}
      </SectionCard>
    </div>
  );
}

function punchRows(punches: PunchRow[]): TableCell[][] {
  return punches.map((punch) => [
    { text: fmtDay(punch.workDate) },
    { text: punch.checkinAt === null ? "—" : punch.checkinAt.slice(11, 16) },
    { text: punch.checkoutAt === null ? "—" : punch.checkoutAt.slice(11, 16) },
    { text: fmtDistance(punch.checkinDistanceM), quiet: true },
    { text: fmtDistance(punch.checkoutDistanceM), quiet: true },
    { text: punch.status, status: true },
  ]);
}

/** The rule governing today: of the revisions whose window covers today
 *  (IST) — started on or before it, not ended before it — the newest one.
 *  A future-dated or already-retired rule never stands in for today's, the
 *  same pick the backend's day grading uses. */
function currentRule(office: OfficeDetail): OfficeDetail["rules"][number] | null {
  const today = istToday();
  const current = office.rules.filter(
    (rule) => rule.validFrom <= today && (rule.validTo === null || today < rule.validTo),
  );
  return current.length === 0 ? null : current[current.length - 1];
}
