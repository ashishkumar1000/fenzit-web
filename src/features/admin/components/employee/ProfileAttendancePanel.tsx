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
  const ruleRevisions = office.ok && office.data !== null ? office.data.rules : null;
  return (
    <div className={styles.stack}>
      <div className={styles.topRow}>
        <SectionCard title="Assigned Office">
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
        <SectionCard title="Work Timings">
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
              <span aria-hidden="true">‹</span> Previous Month
            </Link>
            <Link
              to={`${basePath}?tab=attendance&month=${shiftMonth(month, 1)}`}
              className={styles.monthLink}
            >
              Next Month <span aria-hidden="true">›</span>
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
            rows={punchRows(
              punches.data,
              ruleRevisions,
              office.ok && office.data !== null ? office.data.id : null,
            )}
            empty={`Attendance details will appear here once ${memberName} checks in${assigned?.officeName != null ? ` at ${assigned.officeName}` : ""}.`}
          />
        )}
      </SectionCard>
    </div>
  );
}

function punchRows(
  punches: PunchRow[],
  rules: WorkRule[] | null,
  officeId: string | null,
): TableCell[][] {
  return punches.map((punch) => [
    { text: fmtDay(punch.workDate) },
    {
      node: <CheckInCell at={punch.checkinAt} lateBy={lateBy(punch, rules, officeId)} />,
      text: punch.checkinAt === null ? "—" : checkinTime(punch.checkinAt),
    },
    { text: punch.checkoutAt === null ? "—" : punch.checkoutAt.slice(11, 16) },
    { text: fmtDistance(punch.checkinDistanceM), quiet: true },
    { text: fmtDistance(punch.checkoutDistanceM), quiet: true },
    { text: punch.status, status: true },
  ]);
}

type WorkRule = OfficeDetail["rules"][number];

/** The punch's check-in time, with the rule's late grade when the punch
 *  crossed it — the Work Timings card explains the rule, so the history
 *  must apply it, not just print "Present". */
function CheckInCell({ at, lateBy }: { at: string | null; lateBy: number | null }) {
  if (at === null) return <span className={styles.muted}>—</span>;
  return (
    <span className={styles.checkinCell}>
      {checkinTime(at)}
      {lateBy !== null ? <span className={styles.late}>Late {lateBy} min</span> : null}
    </span>
  );
}

function checkinTime(at: string): string {
  return at.slice(11, 16);
}

/** Minutes past the rule that governed that day's late threshold (start +
 *  cut-off), or null when the punch is on time, has no check-in, or no rule
 *  covers the day. The wire's timestamps carry the tenant offset, so the
 *  clock digits compare directly.
 *
 *  Only the assigned office's rule revisions are at hand, so a punch taken
 *  at another office (before a transfer, or a different site) stays ungraded
 *  rather than borrowing a rule that never applied to it. */
function lateBy(punch: PunchRow, rules: WorkRule[] | null, officeId: string | null): number | null {
  if (rules === null || punch.checkinAt === null) return null;
  if (officeId === null || punch.officeId !== officeId) return null;
  const rule = ruleOn(rules, punch.workDate);
  if (rule === null) return null;
  const checkin = toMinutes(checkinTime(punch.checkinAt));
  const start = toMinutes(rule.startTime);
  if (checkin === null || start === null) return null;
  const late = checkin - (start + rule.lateCutoffMinutes);
  return late > 0 ? late : null;
}

function toMinutes(time: string): number | null {
  const [hours, minutes] = time.split(":").map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  return hours * 60 + minutes;
}

/** The rule governing today (IST). The late flag asks for the rule covering
 *  each punch's own day instead. */
function currentRule(office: OfficeDetail): WorkRule | null {
  return ruleOn(office.rules, istToday());
}

/** The rule covering one day: of the revisions whose window includes it —
 *  started on or before it, not ended before it — the newest one. A
 *  future-dated or already-retired rule never stands in, the same pick the
 *  backend's day grading uses. */
function ruleOn(rules: WorkRule[], day: string): WorkRule | null {
  const covering = rules.filter(
    (rule) => rule.validFrom <= day && (rule.validTo === null || day < rule.validTo),
  );
  return covering.length === 0 ? null : covering[covering.length - 1];
}
