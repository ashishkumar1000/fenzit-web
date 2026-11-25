import { fmtWhen } from "../../format";
import { fmtMoney } from "../../payrollFormat";
import type { AuditEntryView } from "../../payrollRunApi";
import type { MemberRow } from "../../companyApi";
import styles from "./AuditPanel.module.css";

/**
 * The payroll audit trail: every `payroll.*` entry the BE keeps, newest
 * first, with the actor and target resolved against the team list. The
 * details block is shaped per action — never raw JSON for the owner.
 */

type SliceOf<T> = { ok: true; data: T } | { ok: false };

/** Human labels for every action the BE emits. The wire carries the
 *  `payroll.`-prefixed action (the audit service filters on it); the
 *  prefix is stripped at the render boundary below, so the keys here are
 *  the bare names. */
const ACTION_LABELS: Record<string, string> = {
  run_completed: "Salary calculation completed",
  run_failed: "Salary calculation failed",
  month_locked: "Month locked",
  run_override_set: "Government deduction amount changed",
  offcycle_staged: "Extra payment waiting",
  offcycle_updated: "Extra payment updated",
  offcycle_cancelled: "Extra payment cancelled",
  component_created: "Salary component added",
  component_updated: "Salary component updated",
  structure_saved: "Salary structure saved",
  head_saved: "Deduction added",
  head_deactivated: "Deduction stopped",
  calendar_saved: "Salary settings updated",
  state_rules_updated: "State government rules updated",
  pf_config_saved: "PF settings updated",
  pf_exclusion_set: "Employee's PF settings updated",
};

/** A one-line read of the entry's details, per action — keyed exactly as
 *  the BE writes them (verified against each service's audit call; the
 *  read path passes `details` through untranslated). Money may arrive as
 *  2dp text or a raw number depending on the writer. */
function detailsLine(action: string, details: Record<string, unknown>): string {
  const money = (value: unknown): string =>
    typeof value === "string"
      ? fmtMoney(value)
      : typeof value === "number" && Number.isFinite(value)
        ? fmtMoney(String(value))
        : "";
  const month = (value: unknown): string => (typeof value === "string" ? value : "");
  switch (action) {
    case "run_completed":
      return typeof details.payslips === "number"
        ? `${month(details.month)} – ${details.payslips} salary slips created.`
        : month(details.month);
    case "run_failed":
      return [month(details.month), typeof details.reason === "string" ? details.reason : ""]
        .filter((part) => part !== "")
        .join(" – ");
    case "month_locked":
      return month(details.month);
    case "run_override_set":
      return details.field === "tds"
        ? `TDS changed to ${money(details.amount)} for ${month(details.month)}`
        : `Employee's PF amount changed to ${money(details.amount)} for ${month(details.month)}`;
    case "offcycle_staged": {
      const signed = money(details.amount);
      const label = String(details.label ?? "");
      return signed !== "" ? `${label} – ${signed}` : label;
    }
    case "offcycle_updated": {
      const oldBlock = details.old as Record<string, unknown> | undefined;
      const newBlock = details.new as Record<string, unknown> | undefined;
      const oldLabel = typeof oldBlock?.label === "string" ? oldBlock.label : "";
      const newLabel = typeof newBlock?.label === "string" ? newBlock.label : "";
      return oldLabel !== newLabel ? `Old name: ${oldLabel}. New name: ${newLabel}.` : newLabel;
    }
    case "offcycle_cancelled": {
      const signed = money(details.amount);
      const label = String(details.label ?? "");
      return signed !== "" ? `${label} – ${signed}` : label;
    }
    case "component_created":
    case "component_updated":
      // The BE records the changed fields only, no name — the label above
      // already says what happened.
      return "";
    case "structure_saved":
      return month(details.effective_from) !== ""
        ? `Starts from ${month(details.effective_from)}.`
        : "";
    case "head_saved": {
      const label = String(details.name ?? "");
      const signed = money(details.amount);
      return signed !== "" ? `${label} – ${signed}` : label;
    }
    case "head_deactivated":
      return String(details.name ?? "");
    case "calendar_saved":
      return month(details.effective_from) !== ""
        ? `Starts from ${month(details.effective_from)}.`
        : "";
    case "state_rules_updated":
      return details.notified === true ? "Marked as updated." : "Marked as not updated.";
    case "pf_config_saved":
      return `From ${month(details.effective_from)} – ${
        details.covered === true ? "PF will apply to employees." : "PF will not apply to employees."
      }`;
    case "pf_exclusion_set":
      return details.excluded === true
        ? "Employee is not covered by PF."
        : "Employee is covered by PF.";
    default:
      return "";
  }
}

export function AuditPanel({
  entries,
  members,
}: {
  entries: SliceOf<AuditEntryView[]>;
  members: SliceOf<MemberRow[]>;
}) {
  if (!entries.ok || !members.ok) {
    return (
      <div className={styles.card}>
        <p className={styles.failed} role="alert">
          We could not load the history. Please go back to the menu and open this page again.
        </p>
      </div>
    );
  }
  const nameFor = (userId: string): string =>
    members.data.find((m) => m.userId === userId)?.name ?? "Someone";
  return (
    <div className={styles.card}>
      <p className={styles.panelLede}>
        See all changes made to salary settings in your company. You can check who made the change,
        which employee it was for and what was changed.
      </p>
      {entries.data.length === 0 ? (
        <p className={styles.empty}>
          No changes have been recorded yet. Once you start making salary-related changes, they will
          appear here.
        </p>
      ) : (
        <ul className={styles.entries}>
          {entries.data.map((entry) => {
            const key = entry.action.replace(/^payroll\./, "");
            const label = ACTION_LABELS[key] ?? entry.action;
            const line = detailsLine(key, entry.details);
            return (
              <li key={entry.id} className={styles.entry}>
                <div className={styles.entryHead}>
                  <span className={styles.entryAction}>{label}</span>
                  <span className={styles.entryWhen}>{fmtWhen(entry.createdAt)}</span>
                </div>
                <p className={styles.entryLine}>
                  {nameFor(entry.actorId)}
                  {entry.targetUserId !== null
                    ? ` made a change for ${nameFor(entry.targetUserId)}`
                    : " made a change"}
                  {line !== "" ? `: ${line}` : ""}
                </p>
              </li>
            );
          })}
        </ul>
      )}
      {entries.data.length >= 100 ? (
        <p className={styles.hint}>Showing the latest 100 changes.</p>
      ) : null}
    </div>
  );
}
