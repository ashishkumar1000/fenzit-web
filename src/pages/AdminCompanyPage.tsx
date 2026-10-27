import { useLoaderData, useRevalidator } from "react-router";
import type { adminCompanyLoader } from "../features/admin/adminCompanyLoader";
import { humanize } from "../features/admin/status";
import { SectionCard } from "../features/admin/components/SectionCard";
import { StatTiles, type StatTile } from "../features/admin/components/StatTiles";
import { DataTable, type TableCell } from "../features/admin/components/Table";
import { fmtDay, fmtPhone, fmtWhen } from "../features/admin/format";
import styles from "./AdminCompanyPage.module.css";

const ROLE_LABEL: Record<string, string> = {
  company_admin: "Owner",
  employee: "Employee",
  viewer: "Viewer",
};

/** The owner's Company section: today's pulse, the roster, leave, audit. */
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

      {data.members.ok ? (
        <SectionCard title="Team" meta={String(data.members.data.length)}>
          <DataTable
            columns={["Name", "Phone", "Code", "Role", "Status"]}
            empty="Nobody on the team yet."
            rows={data.members.data.map((m): TableCell[] => [
              { text: m.name ?? "(no name)" },
              { text: fmtPhone(m.countryCode, m.phoneNumber), quiet: true },
              { text: m.employeeCode },
              { text: ROLE_LABEL[m.role] ?? humanize(m.role) },
              { text: m.status, status: true },
            ])}
          />
        </SectionCard>
      ) : null}

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
