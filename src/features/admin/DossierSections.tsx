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
  DossierMembership,
  DossierNotification,
  DossierOffice,
  DossierReport,
  LookupResponse,
} from "./dossier-types";
import { fmtDateRange, fmtDay, fmtDistance, fmtWhen } from "./format";
import styles from "./DossierSections.module.css";

/** One dossier dataset per card. Every card states what it shows, its true
 *  total in the meta line, and an "and N more" footer when the rows are a
 *  capped recent slice. */

function more(total: number, shown: number, what: string) {
  return total > shown ? `And ${total - shown} more ${what}` : null;
}

export function CompaniesSection({ memberships }: { memberships: DossierMembership[] }) {
  return (
    <SectionCard title="Companies" meta={memberships.length > 0 ? `${memberships.length}` : null}>
      <DataTable
        columns={["Company Name", "Role", "Status", "Company Code", "Invited By", "Joined On"]}
        empty="This person is not part of any company."
        rows={memberships.map((m): TableCell[] => [
          { text: `${m.company}${m.isFounder ? " (Founder)" : ""}` },
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
        columns={[
          "Team Members",
          "Customers",
          "Jobs",
          "Attendance",
          "GST Number (GSTIN)",
          "UPI ID",
          "State",
        ]}
        empty="No company details available."
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
        columns={[
          "Job Number",
          "Status",
          "Current Step",
          "Work Type",
          "Customer",
          "Scheduled Date",
          "Photos",
        ]}
        empty="This person has not worked on any jobs."
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
    `Check-in attempts ${attendance.attemptsCount}`,
    `Attendance corrections ${attendance.corrections}`,
    `Attendance changes ${attendance.overrides} (authored ${attendance.overridesAuthored})`,
    `Weekly holidays ${attendance.weeklyOff}`,
    `Attendance enrolments ${attendance.enrolments}`,
  ];
  return (
    <SectionCard
      title="Attendance"
      meta={`Showing ${attendance.records} attendance records.${
        attendance.records > 5 ? " Latest 5 are shown." : ""
      }`}
      footer={
        <span className={styles.chips}>
          {chips.map((c) => (
            <Badge key={c} label={c} tone="neutral" />
          ))}
        </span>
      }
    >
      <DataTable
        columns={[
          "Date",
          "Check-in",
          "Check-out",
          "Distance at Check-in",
          "Distance at Check-out",
          "GPS Status",
        ]}
        empty="No attendance records found."
        rows={attendance.recent.map((r): TableCell[] => [
          { text: fmtDay(r.workDate) },
          { text: fmtWhen(r.checkin), quiet: true },
          { text: fmtWhen(r.checkout), quiet: true },
          { text: fmtDistance(r.checkinDistance) },
          { text: fmtDistance(r.checkoutDistance) },
          { text: r.mocked ? "Test Location" : "Verified", status: true },
        ])}
      />
      {attendance.attempts.length > 0 ? (
        <div className={styles.stack}>
          <DataTable
            columns={["Attempt Type", "Result", "Service Provider", "Distance", "Date and Time"]}
            empty=""
            rows={attendance.attempts.map((a): TableCell[] => [
              { text: humanize(a.kind) },
              { text: a.outcome, status: true },
              { text: a.provider ?? "—" },
              { text: fmtDistance(a.distance) },
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
        columns={["Start Date", "End Date", "Leave Duration", "Status", "Reason"]}
        empty="No leave requests found."
        rows={d.leave.map((l): TableCell[] => [
          { text: fmtDay(l.start) },
          { text: fmtDay(l.end) },
          { text: humanize(l.part) },
          { text: l.lastState ?? "—", status: l.lastState !== null },
          { text: l.reason ?? "—" },
        ])}
      />
      {d.leaveDays.length > 0 ? (
        <div className={styles.stack}>
          <p className={styles.caption}>Leave Days by Status</p>
          <span className={styles.chips}>
            {d.leaveDays.map((day) => (
              <LeaveDayChip key={day.date} day={day} />
            ))}
          </span>
        </div>
      ) : null}
    </SectionCard>
  );
}

function LeaveDayChip({ day }: { day: DossierLeaveDay }) {
  return <Badge label={`${fmtDay(day.date)} · ${humanize(day.state)}`} tone="neutral" />;
}

/** The leave timeline as its own card — applying, cancelling, revoking. */
export function LeaveEventsSection({ d }: { d: LookupResponse }) {
  return (
    <SectionCard title="Leave History" meta={String(d.leaveEvents.length)}>
      <DataTable
        columns={["Activity", "Changed By", "Leave Dates", "Date and Time"]}
        empty="No leave activity found."
        rows={d.leaveEvents.map((e): TableCell[] => [
          { text: humanize(e.cause) },
          { text: e.actor ?? "—" },
          { text: fmtDateRange(e.dates) },
          { text: fmtWhen(e.createdAt), quiet: true },
        ])}
      />
    </SectionCard>
  );
}

export function SkillsSection({ skills }: { skills: string[] }) {
  return (
    <SectionCard title="Skills" meta={String(skills.length)}>
      {skills.length === 0 ? (
        <DataTable columns={[]} rows={[]} empty="No skills added yet." />
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
      title="Invitations Sent"
      meta={String(total)}
      footer={
        invitedBy !== null ? `Invited by ${invitedBy}` : more(total, invites.length, "invitations")
      }
    >
      <DataTable
        columns={["Person", "Phone Number", "Company", "Role", "Status"]}
        empty="This person has not invited anyone yet."
        rows={invites.map((i): TableCell[] => [
          { text: i.name ?? "No Name" },
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
    <SectionCard title="Attendance Changes" meta={String(corrections.length)}>
      <DataTable
        columns={["Date", "Employee", "Reason"]}
        empty="No attendance changes recorded."
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
        columns={["Notification", "Details", "Read Status", "Date and Time"]}
        empty="No notifications found."
        rows={notifications.map((n): TableCell[] => [
          { text: humanize(n.event) },
          { text: n.summary ?? "—" },
          { text: n.read === null ? "Not Read Yet" : fmtWhen(n.read), quiet: true },
          { text: fmtWhen(n.createdAt), quiet: true },
        ])}
      />
    </SectionCard>
  );
}

export function AuditSection({ rows, total }: { rows: LookupResponse["audit"]; total: number }) {
  return (
    <SectionCard
      title="Change History"
      meta={String(total)}
      footer={more(total, rows.length, "changes")}
    >
      <DataTable
        columns={["Action", "Person Involved", "Date and Time"]}
        empty="No changes recorded yet."
        rows={rows.map((a): TableCell[] => [
          { text: a.action },
          { text: a.isActor ? "Changed by this person." : "Changed for this person." },
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
    <SectionCard
      title="Recent Activity"
      meta={String(total)}
      footer={more(total, rows.length, "activities")}
    >
      <DataTable
        columns={["Activity", "Job", "Date and Time"]}
        empty="No recent activity found."
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
    <SectionCard title="Reports" meta={String(total)} footer={more(total, rows.length, "reports")}>
      <DataTable
        columns={["Report Type", "Status", "Date and Time"]}
        empty="No reports have been requested yet."
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
    <SectionCard title="Office Assignments" meta={String(offices.length)}>
      <DataTable
        columns={["Office Name", "Address", "Attendance Area", "Validity"]}
        empty="No office has been assigned."
        rows={offices.map((o): TableCell[] => [
          { text: o.name },
          { text: o.address ?? "—" },
          { text: fmtDistance(o.radius) },
          { text: o.valid ?? "—" },
        ])}
      />
    </SectionCard>
  );
}
