import { useLoaderData, useRevalidator } from "react-router";
import type { adminMeLoader } from "../features/admin/adminMeLoader";
import { Badge } from "../features/admin/components/Badge";
import { humanize } from "../features/admin/status";
import { GlyphMe } from "../features/admin/components/glyphs";
import { SectionCard } from "../features/admin/components/SectionCard";
import { DataTable, type TableCell } from "../features/admin/components/Table";
import { fmtDay, fmtPhone, fmtWhen } from "../features/admin/format";
import styles from "./AdminMePage.module.css";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function weeklyOffLabel(days: number[]): string {
  if (days.length === 0) return "none";
  return days.map((d) => WEEKDAYS[d - 1] ?? String(d)).join(", ");
}

/** The Me section: my profile, my attendance facts, my leave, my jobs. */
export function AdminMePage() {
  const data = useLoaderData<typeof adminMeLoader>();
  const revalidator = useRevalidator();
  const checking = revalidator.state !== "idle";

  if (data.state === "failed") {
    return (
      <div className={styles.stack}>
        <SectionCard title="My data">
          <p className={styles.failed} role="alert">
            Your data could not load.
            <button
              type="button"
              className={styles.retry}
              onClick={() => revalidator.revalidate()}
              disabled={checking}
            >
              {checking ? "Retrying…" : "Retry"}
            </button>
          </p>
        </SectionCard>
      </div>
    );
  }

  const s = data.summary.ok ? data.summary.data : null;
  const today = s?.today ?? null;
  const record = s?.todayRecord ?? null;

  return (
    <div className={styles.stack}>
      <header className={styles.identity}>
        <span className={styles.avatar} aria-hidden="true">
          <GlyphMe size={26} />
        </span>
        <div>
          <h2 className={styles.name}>{data.me.name ?? "(no name)"}</h2>
          <p className={styles.facts}>
            <span>{fmtPhone(data.me.countryCode, data.me.phoneNumber)}</span>
            {data.me.email !== null ? <span>{data.me.email}</span> : null}
            {data.me.employeeCode !== null ? <span>code {data.me.employeeCode}</span> : null}
            {data.me.role !== null ? <Badge label={humanize(data.me.role)} tone="neutral" /> : null}
            {data.me.status !== null ? (
              <Badge label={data.me.status} tone="neutral" />
            ) : (
              <span>not part of a team yet</span>
            )}
          </p>
        </div>
      </header>

      {s ? (
        <SectionCard title="Attendance" meta={s.officeName ?? "no office"}>
          <div className={styles.factGrid}>
            <Fact label="Shift" value={`${s.startTime ?? "—"} – ${s.endTime ?? "—"}`} />
            <Fact
              label="Late after"
              value={s.lateCutOffMinutes === null ? "—" : `${s.lateCutOffMinutes} min`}
            />
            <Fact label="Weekly off" value={weeklyOffLabel(s.weeklyOffDays)} />
            {today ? (
              <Fact
                label="Today"
                value={
                  today.isHoliday
                    ? `holiday${today.holidayName ? ` · ${today.holidayName}` : ""}`
                    : today.isWeeklyOff
                      ? "weekly off"
                      : today.leaveState
                        ? `on leave (${humanize(today.leaveState)})`
                        : today.isWorkingDay
                          ? "working day"
                          : "—"
                }
              />
            ) : null}
            {record ? (
              <>
                <Fact label="Check-in" value={fmtWhen(record.checkinAt)} />
                <Fact label="Check-out" value={fmtWhen(record.checkoutAt)} />
                <Fact
                  label="Worked"
                  value={record.workedMinutes === null ? "—" : `${record.workedMinutes} min`}
                />
                {record.isLate ? (
                  <Fact label="Late by" value={`${record.lateMinutes} min`} />
                ) : null}
              </>
            ) : null}
          </div>
        </SectionCard>
      ) : (
        <SectionCard title="Attendance">
          <p className={styles.failed} role="alert">
            Attendance could not load — it may not be enabled for you yet.
          </p>
        </SectionCard>
      )}

      <div className={styles.pair}>
        {data.leave.ok ? (
          <SectionCard title="My leave" meta={String(data.leave.data.length)}>
            <DataTable
              columns={["From", "To", "Part", "Days", "State"]}
              empty="No leave requests."
              rows={data.leave.data.map((l): TableCell[] => [
                { text: fmtDay(l.startDate) },
                { text: fmtDay(l.endDate) },
                { text: humanize(l.part) },
                { text: `${l.workingDays} of ${l.totalDays}` },
                { text: l.status, status: true },
              ])}
            />
          </SectionCard>
        ) : null}

        {data.jobs.ok ? (
          <SectionCard title="My jobs" meta={String(data.jobs.data.length)}>
            <DataTable
              columns={["Job", "Status", "Step", "Skill", "Scheduled"]}
              empty="No jobs assigned."
              rows={data.jobs.data.map((j): TableCell[] => [
                { text: j.jobNumber },
                { text: j.status, status: true },
                { text: j.currentStep ?? "—" },
                { text: j.skill?.name ?? "—" },
                { text: fmtWhen(j.scheduledStart), quiet: true },
              ])}
            />
          </SectionCard>
        ) : null}
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.fact}>
      <p className={styles.factLabel}>{label}</p>
      <p className={styles.factValue}>{value}</p>
    </div>
  );
}
