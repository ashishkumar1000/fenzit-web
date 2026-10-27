import { Badge } from "./components/Badge";
import { GlyphMe, GlyphShield } from "./components/glyphs";
import { StatTiles, type StatTile } from "./components/StatTiles";
import type { LookupResponse } from "./dossier-types";
import { fmtPhone, fmtWhen } from "./format";
import {
  ActivitySection,
  AttendanceSection,
  AuditSection,
  CompaniesSection,
  CompanySummarySection,
  InvitesSection,
  JobsSection,
  LeaveEventsSection,
  LeaveSection,
  ModerationsSection,
  NotificationsSection,
  OfficesSection,
  ReportsSection,
  SkillsSection,
} from "./DossierSections";
import styles from "./DossierView.module.css";

/**
 * The staff dossier: identity first, glanceable totals, then one card per
 * dataset — the web rendering of the super-CLI whois. Destructive work has
 * no place here; this view is read-only by design.
 */
export function DossierView({ d }: { d: LookupResponse }) {
  const tiles: StatTile[] = [
    { label: "Jobs", value: d.counts.jobs },
    { label: "Attendance", value: d.counts.attendanceRecords },
    { label: "Attempts", value: d.counts.attendanceAttempts },
    { label: "Leave", value: d.counts.leaveRequests },
    { label: "Invites sent", value: d.counts.invitesSent },
    { label: "Notifications", value: d.counts.notifications },
    { label: "Audit rows", value: d.counts.auditRows },
    { label: "Activity", value: d.counts.activityRows },
  ];
  return (
    <div className={styles.root}>
      <header className={styles.identity}>
        <span className={styles.avatar} aria-hidden="true">
          <GlyphMe size={26} />
        </span>
        <div className={styles.who}>
          <h2 className={styles.name}>{d.user.name ?? "(no name)"}</h2>
          <p className={styles.badges}>
            {d.user.platformAdmin ? <Badge label="Fenzit staff" tone="progress" /> : null}
            {d.user.disabled ? <Badge label="Disabled" tone="cancelled" /> : null}
            {d.user.platformAdmin || d.user.disabled ? null : (
              <Badge label="Regular account" tone="neutral" />
            )}
            {d.company?.isFounder ? <Badge label="Founder" tone="done" /> : null}
          </p>
        </div>
        <span className={styles.shield} aria-hidden="true">
          <GlyphShield size={22} />
        </span>
      </header>
      <p className={styles.facts}>
        <span>{fmtPhone(d.user.countryCode, d.user.phoneNumber)}</span>
        <span>{d.user.email ?? "no email"}</span>
        <span>joined {fmtWhen(d.user.createdAt)}</span>
        <span>
          last sign-in {d.user.lastSignInAt === null ? "unknown" : fmtWhen(d.user.lastSignInAt)}
        </span>
        <span className={styles.uid}>{d.user.id}</span>
      </p>
      <StatTiles tiles={tiles} />
      <div className={styles.grid}>
        {d.company ? <CompanySummarySection company={d.company} /> : null}
        <CompaniesSection memberships={d.memberships} />
        <JobsSection jobs={d.jobs} total={d.counts.jobs} />
        <AttendanceSection attendance={d.attendance} />
        <LeaveSection d={d} />
        <LeaveEventsSection d={d} />
        <OfficesSection offices={d.offices} />
        <SkillsSection skills={d.skills} />
        <InvitesSection
          invites={d.invites.sent}
          total={d.counts.invitesSent}
          invitedBy={d.invites.invitedBy}
        />
        <ModerationsSection corrections={d.authored.corrections} />
        <NotificationsSection notifications={d.notifications} total={d.counts.notifications} />
        <AuditSection rows={d.audit} total={d.counts.auditRows} />
        <ActivitySection rows={d.activity} total={d.counts.activityRows} />
        <ReportsSection rows={d.reports} total={d.counts.reports} />
      </div>
    </div>
  );
}
