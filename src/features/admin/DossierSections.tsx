import { Badge } from "./components/Badge";
import { humanize } from "./status";
import { SectionCard } from "./components/SectionCard";
import { DataTable, type TableCell } from "./components/Table";
import type {
  DossierAttendance,
  DossierCompany,
  DossierInvite,
  DossierJob,
  DossierLeaveDay,
  DossierLeaveEvent,
  DossierMembership,
  DossierNotification,
  DossierOffice,
  DossierReport,
  LookupResponse,
} from "./dossier-types";
import { fmtDay, fmtWhen } from "./format";
import styles from "./DossierSections.module.css";

/** One dossier dataset per card. Every card states what it shows, its true
 *  total in the meta line, and an "and N more" footer when the rows are a
 *  capped recent slice. */

function more(total: number, shown: number, what: string) {
  return total > shown ? `and ${total - shown} more ${what}` : null;
}

export function CompaniesSection({ memberships }: { memberships: DossierMembership[] }) {
  return (
    <SectionCard title="Companies" meta={memberships.length > 0 ? `${memberships.length}` : null}>
      <DataTable
        columns={["Company", "Role", "Status", "Code", "Invited by", "Joined"]}
        empty="No company memberships."
        rows={memberships.map((m): TableCell[] => [
          { text: `${m.company}${m.isFounder ? " (founder)" : ""}` },
          { text: humanize(m.role) },
          { text: m.status, status: true },
          { text: m.employeeCode ?? "—" },
          { text: m.invitedBy ?? "—" },
          { text: fmtWhen(m.joined), quiet: true },
        ])}
      />
    </SectionCard>
  );
}

export function CompanySummarySection({ company }: { company: DossierCompany }) {
  return (
    <SectionCard title="Company" meta={company.name.trim()}>
      <DataTable
        columns={["Members", "Customers", "Jobs", "Attendance", "GSTIN", "UPI", "State"]}
        empty="No company."
        rows={[
          [
            { text: String(company.members) },
            { text: String(company.customers) },
            { text: String(company.jobs) },
            { text: String(company.attendanceRows) },
            { text: company.gstin ?? "—", quiet: true },
            { text: company.upi ?? "—", quiet: true },
            { text: company.state ?? "—" },
          ],
        ]}
      />
    </SectionCard>
  );
}

export function JobsSection({ jobs, total }: { jobs: DossierJob[]; total: number }) {
  return (
    <SectionCard title="Jobs" meta={String(total)} footer={more(total, jobs.length, "jobs")}>
      <DataTable
        columns={["Job", "Status", "Step", "Skill", "Customer", "Scheduled", "Photos"]}
        empty="No jobs as technician."
        rows={jobs.map((j): TableCell[] => [
          { text: j.jobNumber },
          { text: j.status, status: true },
          { text: j.currentStep ?? "—" },
          { text: j.skill ?? "—" },
          { text: j.customer ?? "—" },
          { text: fmtWhen(j.scheduledStart), quiet: true },
          { text: String(j.photos) },
        ])}
      />
    </SectionCard>
  );
}

export function AttendanceSection({ attendance }: { attendance: DossierAttendance }) {
  const chips = [
    `attempts ${attendance.attemptsCount}`,
    `corrections ${attendance.corrections}`,
    `overrides ${attendance.overrides} (authored ${attendance.overridesAuthored})`,
    `weekly-off ${attendance.weeklyOff}`,
    `enrolments ${attendance.enrolments}`,
  ];
  return (
    <SectionCard
      title="Attendance"
      meta={`${attendance.records} records · recent 5`}
      footer={
        <span className={styles.chips}>
          {chips.map((c) => (
            <Badge key={c} label={c} tone="neutral" />
          ))}
        </span>
      }
    >
      <DataTable
        columns={["Day", "Check-in", "Check-out", "In dist.", "Out dist.", "GPS"]}
        empty="No attendance records."
        rows={attendance.recent.map((r): TableCell[] => [
          { text: fmtDay(r.workDate) },
          { text: fmtWhen(r.checkin), quiet: true },
          { text: fmtWhen(r.checkout), quiet: true },
          { text: r.checkinDistance === null ? "—" : `${r.checkinDistance} m` },
          { text: r.checkoutDistance === null ? "—" : `${r.checkoutDistance} m` },
          { text: r.mocked ? "mocked" : "ok", status: true },
        ])}
      />
      {attendance.attempts.length > 0 ? (
        <div className={styles.stack}>
          <DataTable
            columns={["Attempt kind", "Outcome", "Provider", "Distance", "When"]}
            empty=""
            rows={attendance.attempts.map((a): TableCell[] => [
              { text: humanize(a.kind) },
              { text: a.outcome, status: true },
              { text: a.provider ?? "—" },
              { text: a.distance === null ? "—" : `${a.distance} m` },
              { text: fmtWhen(a.createdAt), quiet: true },
            ])}
          />
        </div>
      ) : null}
    </SectionCard>
  );
}

export function LeaveSection({ d }: { d: LookupResponse }) {
  return (
    <SectionCard
      title="Leave"
      meta={String(d.counts.leaveRequests)}
      footer={more(d.counts.leaveRequests, d.leave.length, "requests")}
    >
      <DataTable
        columns={["From", "To", "Part", "State", "Reason"]}
        empty="No leave requests."
        rows={d.leave.map((l): TableCell[] => [
          { text: fmtDay(l.start) },
          { text: fmtDay(l.end) },
          { text: humanize(l.part) },
          { text: l.lastState ?? "—", status: l.lastState !== null },
          { text: l.reason ?? "—" },
        ])}
      />
      {d.leaveDays.length > 0 ? (
        <span className={styles.chips}>
          {d.leaveDays.map((day) => (
            <LeaveDayChip key={day.date} day={day} />
          ))}
        </span>
      ) : null}
      {d.leaveEvents.length > 0 ? (
        <div className={styles.stack}>
          <LeaveEventsTable events={d.leaveEvents} />
        </div>
      ) : null}
    </SectionCard>
  );
}

function LeaveDayChip({ day }: { day: DossierLeaveDay }) {
  return <Badge label={`${fmtDay(day.date)} · ${humanize(day.state)}`} tone="neutral" />;
}

function LeaveEventsTable({ events }: { events: DossierLeaveEvent[] }) {
  return (
    <DataTable
      columns={["Event", "Actor", "Dates", "When"]}
      empty=""
      rows={events.map((e): TableCell[] => [
        { text: humanize(e.cause) },
        { text: e.actor ?? "—" },
        { text: e.dates ?? "—" },
        { text: fmtWhen(e.createdAt), quiet: true },
      ])}
    />
  );
}

export function SkillsSection({ skills }: { skills: string[] }) {
  return (
    <SectionCard title="Skills" meta={String(skills.length)}>
      {skills.length === 0 ? (
        <DataTable columns={[]} rows={[]} empty="No skills enrolled." />
      ) : (
        <span className={styles.chips}>
          {skills.map((s) => (
            <Badge key={s} label={s} tone="neutral" />
          ))}
        </span>
      )}
    </SectionCard>
  );
}

export function InvitesSection({
  invites,
  total,
  invitedBy,
}: {
  invites: DossierInvite[];
  total: number;
  invitedBy: string | null;
}) {
  return (
    <SectionCard
      title="Invites sent"
      meta={String(total)}
      footer={
        invitedBy !== null ? `invited by ${invitedBy}` : more(total, invites.length, "invites")
      }
    >
      <DataTable
        columns={["Person", "Phone", "Company", "Role", "Status"]}
        empty="Nobody invited by this person."
        rows={invites.map((i): TableCell[] => [
          { text: i.name ?? "(no name)" },
          { text: i.phone, quiet: true },
          { text: i.company },
          { text: humanize(i.role) },
          { text: i.status, status: true },
        ])}
      />
    </SectionCard>
  );
}

export function ModerationsSection({
  corrections,
}: {
  corrections: LookupResponse["authored"]["corrections"];
}) {
  return (
    <SectionCard title="Attendance moderations" meta={String(corrections.length)}>
      <DataTable
        columns={["Day", "Employee", "Note"]}
        empty="No corrections authored."
        rows={corrections.map((c): TableCell[] => [
          { text: fmtDay(c.workDate) },
          { text: c.employee ?? "—" },
          { text: c.note ?? "—" },
        ])}
      />
    </SectionCard>
  );
}

export function NotificationsSection({
  notifications,
  total,
}: {
  notifications: DossierNotification[];
  total: number;
}) {
  return (
    <SectionCard
      title="Notifications"
      meta={String(total)}
      footer={more(total, notifications.length, "notifications")}
    >
      <DataTable
        columns={["Event", "Summary", "Read", "When"]}
        empty="No notifications."
        rows={notifications.map((n): TableCell[] => [
          { text: humanize(n.event) },
          { text: n.summary ?? "—" },
          { text: n.read === null ? "unread" : fmtWhen(n.read), quiet: true },
          { text: fmtWhen(n.createdAt), quiet: true },
        ])}
      />
    </SectionCard>
  );
}

export function AuditSection({ rows, total }: { rows: LookupResponse["audit"]; total: number }) {
  return (
    <SectionCard title="Audit trail" meta={String(total)} footer={more(total, rows.length, "rows")}>
      <DataTable
        columns={["Action", "Direction", "When"]}
        empty="No audit rows."
        rows={rows.map((a): TableCell[] => [
          { text: a.action },
          { text: a.isActor ? "as actor" : "as target" },
          { text: fmtWhen(a.createdAt), quiet: true },
        ])}
      />
    </SectionCard>
  );
}

export function ActivitySection({
  rows,
  total,
}: {
  rows: LookupResponse["activity"];
  total: number;
}) {
  return (
    <SectionCard title="Activity" meta={String(total)} footer={more(total, rows.length, "events")}>
      <DataTable
        columns={["Event", "Job", "When"]}
        empty="No activity events."
        rows={rows.map((a): TableCell[] => [
          { text: humanize(a.event) },
          { text: a.jobNumber ?? "—" },
          { text: fmtWhen(a.createdAt), quiet: true },
        ])}
      />
    </SectionCard>
  );
}

export function ReportsSection({ rows, total }: { rows: DossierReport[]; total: number }) {
  return (
    <SectionCard title="Reports" meta={String(total)} footer={more(total, rows.length, "requests")}>
      <DataTable
        columns={["Type", "Status", "When"]}
        empty="No report requests."
        rows={rows.map((r): TableCell[] => [
          { text: humanize(r.type) },
          { text: r.status, status: true },
          { text: fmtWhen(r.createdAt), quiet: true },
        ])}
      />
    </SectionCard>
  );
}

export function OfficesSection({ offices }: { offices: DossierOffice[] }) {
  return (
    <SectionCard title="Offices" meta={String(offices.length)}>
      <DataTable
        columns={["Office", "Address", "Radius", "Validity"]}
        empty="No office assignments."
        rows={offices.map((o): TableCell[] => [
          { text: o.name },
          { text: o.address ?? "—" },
          { text: o.radius === null ? "—" : `${o.radius} m` },
          { text: o.valid ?? "—" },
        ])}
      />
    </SectionCard>
  );
}
