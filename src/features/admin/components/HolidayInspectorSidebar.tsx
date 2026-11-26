import { useFetcher } from "react-router";
// eslint-disable-next-line no-restricted-imports -- the only effect here reacts to the delete fetcher landing by closing the sheet (UI lifecycle, not server data in an effect).
import { useEffect, useState } from "react";
import type { HolidayImpact, HolidayOverview, HolidayRow } from "../companyApi";
import type { HolidayActionResult } from "../holidayLoaders";
import { fmtDayLong } from "../format";
import { weekdayName } from "../leaveDateMath";
import { monthShort, officeLabel } from "../holidaysMath";
import styles from "./HolidayInspectorSidebar.module.css";

/**
 * The schedule page's inspector sidebar (2026-11-26): opens when a schedule
 * row is clicked, carries REAL facts — the approved-leave overlap and the
 * per-office headcounts the impact endpoint read for that date — and the
 * actions the row itself offers. Edit opens the holiday modal seeded with
 * this holiday (Sally P0: the buttons used to only close the sheet); Delete
 * asks once inline before firing. The sheet closes by clearing ?inspect, so
 * back/forward and refresh behave like any navigation.
 */
export function HolidayInspectorSidebar({
  inspect,
  overview,
  onClose,
  onEdit,
}: {
  inspect: HolidayImpact;
  overview: HolidayOverview;
  onClose: () => void;
  onEdit: (holiday: HolidayRow) => void;
}) {
  const fetcher = useFetcher<HolidayActionResult>();
  const removing = fetcher.state !== "idle" && fetcher.formData?.get("intent") === "remove";
  const [confirming, setConfirming] = useState(false);
  // A landed remove revalidates with ?inspect still set — the sheet would
  // re-open as "Plain Working Day" on the date just deleted. Close it.
  useEffect(() => {
    if (fetcher.data?.kind === "remove" && fetcher.data.state === "done") onClose();
  }, [fetcher.data, onClose]);
  const holiday = inspect.holiday;
  const officeNames = new Map(overview.offices.map((o) => [o.officeId, o.name]));
  // The next holiday strictly after the inspected date (client-side over
  // the year's list — no extra fetch).
  const next =
    [...overview.holidays]
      .filter((h) => h.date > inspect.date)
      .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;
  // Clamp at zero — leave counted for someone the tracked roster no longer
  // includes must never read as a negative "at work" count.
  const offDuty = Math.max(0, inspect.trackedCount - inspect.approvedLeaveCount);
  // The leave-overlap bar: the on-leave share of the day's tracked staff.
  const leaveShare =
    inspect.trackedCount > 0
      ? Math.min(100, Math.round((inspect.approvedLeaveCount / inspect.trackedCount) * 100))
      : 0;
  // "Offices closed on this day": the holiday's closed offices, plus the
  // office-less staff — but only when the holiday covers everyone ('all');
  // a scoped holiday leaves unassigned staff working. On a plain working
  // day nothing is closed at all.
  const closedOffices = inspect.perOffice.filter((office) => office.closed);
  const wfhOff =
    holiday !== null && (holiday.scope ?? "all") === "all" && inspect.unassignedCount > 0;

  return (
    <aside className={styles.sidebar} aria-label="Holiday inspector">
      <header className={styles.top}>
        <p className={styles.eyebrow}>{holiday ? "● Official Holiday" : "● Plain Working Day"}</p>
        <div className={styles.topActions}>
          {holiday ? (
            <button type="button" className={styles.editDate} onClick={() => onEdit(holiday)}>
              ✎ Edit
            </button>
          ) : null}
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Close inspector"
          >
            ×
          </button>
        </div>
      </header>

      <h2 className={styles.dateTitle}>{fmtDayLong(inspect.date)}</h2>
      {holiday ? (
        <p className={styles.dateLine}>
          <span className={styles.holidayDot}>● {holiday.name}</span>
          <span className={styles.muted}>
            Day off for {officeLabel(holiday, officeNames).toLowerCase()}
          </span>
        </p>
      ) : (
        <p className={styles.dateLine}>
          <span className={styles.muted}>
            No holiday on this {weekdayName(inspect.date).toLowerCase()}.
          </span>
        </p>
      )}

      {holiday ? (
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <h3 className={styles.cardTitle}>{holiday.name}</h3>
            <span className={styles.tag}>● Holiday</span>
          </div>
          {holiday.description ? <p className={styles.cardDesc}>{holiday.description}</p> : null}
          <p className={styles.cardLine}>
            🗓 {holiday.date === inspect.date ? "Paid holiday" : fmtDayLong(holiday.date)} —{" "}
            {officeLabel(holiday, officeNames)}
          </p>
        </section>
      ) : null}

      <section className={styles.card}>
        <h3 className={styles.sectionTitle}>Team Attendance &amp; Leave</h3>
        <p className={styles.leaveLine}>
          <strong>
            {inspect.approvedLeaveCount} out of {inspect.trackedCount} employees are on leave
          </strong>
        </p>
        <div
          className={styles.bar}
          role="img"
          aria-label={`${inspect.approvedLeaveCount} of ${inspect.trackedCount} employees on approved leave`}
        >
          <span className={styles.barFill} style={{ width: `${leaveShare}%` }} />
        </div>
        {holiday === null ? (
          <p className={styles.muted}>
            {offDuty} team member{offDuty === 1 ? "" : "s"} at work as usual
          </p>
        ) : null}

        <h4 className={styles.subTitle}>Offices closed on this day</h4>
        {closedOffices.length === 0 && !wfhOff ? (
          <p className={styles.muted}>All offices open.</p>
        ) : (
          <div className={styles.chipRow}>
            {closedOffices.map((office) => (
              <span key={office.officeId} className={styles.officeChip}>
                🏢 {office.name} <strong>({office.staffCount} staff)</strong>
              </span>
            ))}
            {wfhOff ? (
              <span className={styles.officeChip}>
                🏠 Work from Home staff <strong>({inspect.unassignedCount} staff)</strong>
              </span>
            ) : null}
          </div>
        )}
      </section>

      {next ? (
        <section className={styles.nextCard}>
          <h4 className={styles.subTitle}>Next upcoming holiday</h4>
          <span className={styles.nextRow}>
            <span className={styles.nextDay}>{next.date.slice(8, 10)}</span>
            <span>
              <strong className={styles.nextName}>{next.name}</strong>
              <small className={styles.muted}>
                {" "}
                {weekdayName(next.date)}, {monthShort(next.date)} · Holiday
              </small>
            </span>
          </span>
        </section>
      ) : null}

      <footer className={styles.foot}>
        {holiday ? (
          confirming ? (
            <div className={styles.confirm}>
              <p className={styles.confirmText}>
                Remove {holiday.name}? The offices it covers get this day back as a working day.
              </p>
              <div className={styles.confirmRow}>
                <button
                  type="button"
                  className={styles.deleteButton}
                  disabled={removing}
                  onClick={() => setConfirming(false)}
                >
                  Cancel
                </button>
                <fetcher.Form method="post" className={styles.footForm}>
                  <input type="hidden" name="intent" value="remove" />
                  <input type="hidden" name="id" value={holiday.id} />
                  <button type="submit" className={styles.deleteButton} disabled={removing}>
                    {removing ? "Deleting…" : "Yes, delete"}
                  </button>
                </fetcher.Form>
              </div>
            </div>
          ) : (
            <div className={styles.confirmRow}>
              <button
                type="button"
                className={styles.deleteButton}
                onClick={() => setConfirming(true)}
              >
                🗑 Delete Holiday
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => onEdit(holiday)}
              >
                ✎ Edit Holiday Details
              </button>
            </div>
          )
        ) : (
          <button type="button" className={styles.primaryButton} onClick={onClose}>
            Close
          </button>
        )}
      </footer>
    </aside>
  );
}
