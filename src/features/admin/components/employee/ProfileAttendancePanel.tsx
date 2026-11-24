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
        <SectionCard title="Office assignment" meta="Tracked office & geofence">
          {!enrolment.ok ? (
            <p className={styles.failed} role="alert">
              The enrolment could not load — retry the page from the menu.
            </p>
          ) : assigned === null ? (
            <p className={styles.empty}>Not enrolled in attendance yet.</p>
          ) : (
            <>
              <p className={styles.officeName}>{assigned.officeName ?? "—"}</p>
              {office.ok && office.data !== null ? (
                <>
                  <p className={styles.address}>
                    {office.data.formattedAddress ?? "Address not set"}
                  </p>
                  <p className={styles.radiusChip}>{office.data.radiusM} m geofence radius</p>
                </>
              ) : null}
              <p className={styles.since}>
                {assigned.attendanceStartDate !== null
                  ? `Assigned since ${fmtDay(assigned.attendanceStartDate)}`
                  : "Assignment date not recorded"}
              </p>
            </>
          )}
        </SectionCard>
        <SectionCard title="Shift rules" meta="How the day is graded">
          {rules !== null ? (
            <dl className={styles.rules}>
              <div className={styles.ruleRow}>
                <dt>Start</dt>
                <dd>{rules.startTime}</dd>
              </div>
              <div className={styles.ruleRow}>
                <dt>End</dt>
                <dd>{rules.endTime}</dd>
              </div>
              <div className={styles.ruleRow}>
                <dt>Late cutoff</dt>
                <dd>{rules.lateCutoffMinutes} min</dd>
              </div>
              <div className={styles.ruleRow}>
                <dt>Full day</dt>
                <dd>{rules.fullDayHours} h</dd>
              </div>
              <div className={styles.ruleRow}>
                <dt>Half day</dt>
                <dd>{rules.halfDayHours} h</dd>
              </div>
            </dl>
          ) : (
            <p className={styles.empty}>
              {/* Only a settled not-enrolled enrolment says "not enrolled" —
                  a failed fetch is this card's failure line. */}
              {enrolment.ok && enrolment.data === null
                ? "No shift rules — the person is not enrolled."
                : "The shift rules could not load."}
            </p>
          )}
        </SectionCard>
      </div>
      <SectionCard
        title="Punch history"
        meta={MONTH_LABEL.format(new Date(`${month}-01T00:00:00Z`))}
        footer={
          <nav className={styles.monthNav} aria-label="Month">
            <Link
              to={`${basePath}?tab=attendance&month=${shiftMonth(month, -1)}`}
              className={styles.monthLink}
            >
              ‹ Previous
            </Link>
            <Link
              to={`${basePath}?tab=attendance&month=${shiftMonth(month, 1)}`}
              className={styles.monthLink}
            >
              Next ›
            </Link>
          </nav>
        }
      >
        {!punches.ok ? (
          <p className={styles.failed} role="alert">
            The punch history could not load — retry the page from the menu.
          </p>
        ) : (
          <DataTable
            columns={["Date", "Check-in", "Check-out", "In distance", "Out distance", "Status"]}
            rows={punchRows(punches.data)}
            empty={`Punches appear here once ${memberName} checks in${assigned?.officeName != null ? ` at ${assigned.officeName}` : ""}.`}
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
