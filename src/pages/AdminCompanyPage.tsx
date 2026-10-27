import { useLoaderData, useRevalidator } from "react-router";
import type { adminCompanyLoader } from "../features/admin/adminCompanyLoader";
import { SectionCard } from "../features/admin/components/SectionCard";
import { StatTiles, type StatTile } from "../features/admin/components/StatTiles";
import { LinkCard } from "../features/admin/components/LinkCard";
import { DataTable, type TableCell } from "../features/admin/components/Table";
import { AttendanceArt } from "../features/admin/components/art/AttendanceArt";
import { CustomersArt } from "../features/admin/components/art/CustomersArt";
import { HolidaysArt } from "../features/admin/components/art/HolidaysArt";
import { JobsArt } from "../features/admin/components/art/JobsArt";
import { TeamArt } from "../features/admin/components/art/TeamArt";
import { fmtDay, fmtWhen } from "../features/admin/format";
import styles from "./AdminCompanyPage.module.css";

/** The owner's overview: today's pulse, then cards that lead to the full
 *  lists (customers, employees, jobs, holidays, attendance), with recent
 *  leave and audit activity underneath. */
export function AdminCompanyPage() {
  const data = useLoaderData<typeof adminCompanyLoader>();
  const revalidator = useRevalidator();
  const checking = revalidator.state !== "idle";

  if (data.state === "failed") {
    return (
      <div className={styles.stack}>
        <SectionCard title="Company data">
          <p className={styles.failed} role="alert">
            The company data could not load.
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

  const tiles: StatTile[] = data.pulse.ok
    ? [
        { label: "Tracked", value: data.pulse.data.counts.tracked },
        { label: "Checked in", value: data.pulse.data.counts.checkedIn },
        { label: "Not checked in", value: data.pulse.data.counts.notCheckedIn },
        { label: "Short day", value: data.pulse.data.counts.shortDay },
        { label: "Late", value: data.pulse.data.counts.late },
        { label: "On leave", value: data.pulse.data.counts.onLeave },
      ]
    : [];

  return (
    <div className={styles.stack}>
      {data.pulse.ok ? (
        <>
          <p className={styles.dateLine}>
            Today, {fmtDay(data.pulse.data.date)}
            {data.pulse.data.flags.checkoutMissing.length +
              data.pulse.data.flags.fakeLocationAttempt.length >
            0 ? (
              <span className={styles.flagLine}>
                {" "}
                · {data.pulse.data.flags.checkoutMissing.length} missing check-out
                {data.pulse.data.flags.fakeLocationAttempt.length > 0
                  ? ` · ${data.pulse.data.flags.fakeLocationAttempt.length} suspect location attempt${data.pulse.data.flags.fakeLocationAttempt.length === 1 ? "" : "s"}`
                  : ""}
              </span>
            ) : null}
          </p>
          <StatTiles tiles={tiles} />
        </>
      ) : (
        <SectionCard title="Today's pulse">
          <p className={styles.failed} role="alert">
            The pulse could not load.
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
      )}

      <div className={styles.cards}>
        <LinkCard
          to="/admin/company/customers"
          label="Customers"
          note="Everyone who buys from you"
          art={<CustomersArt />}
        />
        <LinkCard
          to="/admin/company/employees"
          label="Employees"
          note="Your full team"
          count={data.members.ok ? data.members.data.length : undefined}
          art={<TeamArt />}
        />
        <LinkCard
          to="/admin/company/jobs"
          label="Jobs"
          note="Every job, newest first"
          art={<JobsArt />}
        />
        <LinkCard
          to="/admin/company/holidays"
          label="Holidays"
          note="Upcoming and past"
          art={<HolidaysArt />}
        />
        <LinkCard
          to="/admin/company/attendance"
          label="Attendance"
          note="This month, per employee"
          art={<AttendanceArt />}
        />
      </div>

      <div className={styles.pair}>
        {data.leave.ok ? (
          <SectionCard title="Leave" meta={String(data.leave.data.length)}>
            <DataTable
              columns={["Employee", "From", "To", "Days", "State"]}
              empty="No leave requests."
              rows={data.leave.data.map((l): TableCell[] => [
                { text: l.employeeName ?? l.employeeCode ?? l.id },
                { text: fmtDay(l.startDate) },
                { text: fmtDay(l.endDate) },
                { text: `${l.workingDays} of ${l.totalDays}` },
                { text: l.status, status: true },
              ])}
            />
          </SectionCard>
        ) : null}

        {data.audit.ok ? (
          <SectionCard title="Audit trail" meta={String(data.audit.data.length)}>
            <DataTable
              columns={["Action", "When"]}
              empty="Nothing recorded yet."
              rows={data.audit.data.map((a): TableCell[] => [
                { text: a.action },
                { text: fmtWhen(a.createdAt), quiet: true },
              ])}
            />
          </SectionCard>
        ) : null}
      </div>
    </div>
  );
}
