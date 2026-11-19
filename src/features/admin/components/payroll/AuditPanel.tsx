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
  run_completed: "Payroll run completed",
  run_failed: "Payroll run failed",
  month_locked: "Month locked",
  run_override_set: "Statutory amount overridden",
  offcycle_staged: "Off-cycle line waiting for the run",
  offcycle_updated: "Off-cycle line changed",
  offcycle_cancelled: "Off-cycle line cancelled",
  component_created: "Salary component added",
  component_updated: "Salary component changed",
  structure_saved: "Salary structure saved",
  head_saved: "Deduction saved",
  head_deactivated: "Deduction deactivated",
  calendar_saved: "Payroll calendar saved",
  state_rules_updated: "State rules updated",
  pf_config_saved: "PF switch saved",
  pf_exclusion_set: "PF exclusion saved",
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
        ? `${month(details.month)} — ${details.payslips} payslips`
        : month(details.month);
    case "run_failed":
      return [month(details.month), typeof details.reason === "string" ? details.reason : ""]
        .filter((part) => part !== "")
        .join(" — ");
    case "month_locked":
      return month(details.month);
    case "run_override_set": {
      const field = details.field === "tds" ? "TDS" : "PF employee share";
      return `${field} set to ${money(details.amount)} for ${month(details.month)}`;
    }
    case "offcycle_staged": {
      const signed = money(details.amount);
      const label = String(details.label ?? "");
      return signed !== "" ? `${label} — ${signed}` : label;
    }
    case "offcycle_updated": {
      const oldBlock = details.old as Record<string, unknown> | undefined;
      const newBlock = details.new as Record<string, unknown> | undefined;
      const oldLabel = typeof oldBlock?.label === "string" ? oldBlock.label : "";
      const newLabel = typeof newBlock?.label === "string" ? newBlock.label : "";
      return oldLabel !== newLabel ? `${oldLabel} → ${newLabel}` : newLabel;
    }
    case "offcycle_cancelled": {
      const signed = money(details.amount);
      const label = String(details.label ?? "");
      return signed !== "" ? `${label} — ${signed}` : label;
    }
    case "component_created":
    case "component_updated":
      // The BE records the changed fields only, no name — the label above
      // already says what happened.
      return "";
    case "structure_saved":
      return month(details.effective_from) !== "" ? `from ${month(details.effective_from)}` : "";
    case "head_saved": {
      const label = String(details.name ?? "");
      const signed = money(details.amount);
      return signed !== "" ? `${label} — ${signed}` : label;
    }
    case "head_deactivated":
      return String(details.name ?? "");
    case "calendar_saved":
      return month(details.effective_from) !== "" ? `from ${month(details.effective_from)}` : "";
    case "state_rules_updated":
      return details.notified === true ? "Marked as notified" : "Marked as not notified";
    case "pf_config_saved":
      return `from ${month(details.effective_from)} — ${
        details.covered === true ? "covering employees" : "not covering employees"
      }`;
    case "pf_exclusion_set":
      return details.excluded === true ? "Excluded from PF" : "PF exclusion removed";
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
          The audit trail could not load. Try opening this page again from the menu.
        </p>
      </div>
    );
  }
  const nameFor = (userId: string): string =>
    members.data.find((m) => m.userId === userId)?.name ?? "someone";
  return (
    <div className={styles.card}>
      <p className={styles.panelLede}>
        Every payroll change your company has made, newest first — who did it, about whom, and what
        changed.
      </p>
      {entries.data.length === 0 ? (
        <p className={styles.empty}>
          Nothing recorded yet — payroll changes appear here once you start.
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
                  {entry.targetUserId !== null ? ` — about ${nameFor(entry.targetUserId)}` : ""}
                  {line !== "" ? `: ${line}` : ""}
                </p>
              </li>
            );
          })}
        </ul>
      )}
      {entries.data.length >= 100 ? (
        <p className={styles.hint}>The 100 most recent entries.</p>
      ) : null}
    </div>
  );
}
