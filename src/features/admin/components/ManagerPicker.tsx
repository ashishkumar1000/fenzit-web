import { useId, useMemo, useState } from "react";
import type { MemberRow } from "../companyApi";
import {
  inactiveCurrentManager,
  managerCandidates,
  roleWord,
  viewerManagerNote,
} from "../memberHierarchy";
import { TextInput } from "../../../components/ui/TextInput";
import { Button } from "../../../components/ui/Button";
import styles from "./ManagerPicker.module.css";

/**
 * The Reports-to picker (Epic 24, CAP-6): a search over the active roster, a
 * "No reporting manager" choice, and one radio per candidate. Candidates
 * exclude the member themselves and everyone below them (the server's own
 * cycle rule); a stored manager who is no longer active stays visible as a
 * selected, non-selectable row so a save cannot silently clear the pointer.
 * The list is its own bounded scroll box — a 200-person roster must never
 * push the dialog's Save below the fold.
 */
export function ManagerPicker({
  members,
  memberId,
  selectedId,
  managerName,
  onSelect,
  rosterFailed,
  onRetry,
}: {
  members: MemberRow[];
  /** The member being edited; null for the invite flow (no exclusions). */
  memberId: string | null;
  selectedId: string | null;
  /** The stored manager's name, for the non-selectable row. */
  managerName: string | null;
  onSelect: (managerId: string | null) => void;
  rosterFailed: boolean;
  onRetry: () => void;
}) {
  const [query, setQuery] = useState("");
  // Plain radio-group name: the id from `useId` can carry punctuation that a
  // native form serialisation does not round-trip.
  const groupName = `manager-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const candidates = useMemo(
    () => (memberId === null ? activeMembers(members) : managerCandidates(members, memberId)),
    [members, memberId],
  );
  const stale = inactiveCurrentManager(selectedId, managerName, candidates);
  const needle = query.trim().toLowerCase();
  const visible = candidates.filter(
    (member) =>
      needle === "" ||
      (member.name ?? "").toLowerCase().includes(needle) ||
      member.employeeCode.toLowerCase().includes(needle) ||
      member.phoneNumber.includes(needle),
  );
  const selectedRole = candidates.find((member) => member.userId === selectedId)?.role ?? "";
  const viewerNote = viewerManagerNote(selectedRole);

  if (rosterFailed) {
    return (
      <div className={styles.failed}>
        <p className={styles.failedText} role="alert">
          We could not load your team. Try again.
        </p>
        <Button variant="secondary" size="compact" onClick={onRetry}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <TextInput
        id={`${groupName}-search`}
        label="Search your team"
        type="search"
        value={query}
        onChange={setQuery}
        placeholder="Name, code or phone"
        autoComplete="off"
        // Enter in the invite dialog's search must filter, never send the
        // invitation form around it.
        onKeyDown={(event) => {
          if (event.key === "Enter") event.preventDefault();
        }}
      />
      <fieldset
        className={styles.group}
        // The picker also renders inside the invite form; Enter anywhere in the
        // list must never send that invitation.
        onKeyDown={(event) => {
          if (event.key === "Enter") event.preventDefault();
        }}
      >
        <legend className={styles.legend}>Choose a reporting manager</legend>
        <div className={styles.list}>
          <label className={styles.option}>
            <input
              type="radio"
              name={groupName}
              checked={selectedId === null}
              onChange={() => onSelect(null)}
            />
            <span className={styles.optionText}>
              <span className={styles.optionName}>No reporting manager</span>
              <span className={styles.optionMeta}>Their requests go to the company admins.</span>
            </span>
          </label>
          {stale !== null ? (
            <label className={`${styles.option} ${styles.stale}`}>
              <input
                type="radio"
                name={groupName}
                checked={selectedId === stale.userId}
                // Documented as "selected, non-selectable": the stored manager
                // is not an offer, it is the value a save must not clear.
                disabled
                readOnly
              />
              <span className={styles.optionText}>
                <span className={styles.optionName}>{stale.name ?? "Current manager"}</span>
                <span className={styles.optionMeta}>
                  No longer active. Pick someone else to change this.
                </span>
              </span>
            </label>
          ) : null}
          {visible.map((member) => (
            <label key={member.userId} className={styles.option}>
              <input
                type="radio"
                name={groupName}
                checked={selectedId === member.userId}
                onChange={() => onSelect(member.userId)}
              />
              <span className={styles.optionText}>
                <span className={styles.optionName}>{member.name ?? "Team member"}</span>
                <span className={styles.optionMeta}>
                  {member.employeeCode} · {roleWord(member.role)}
                </span>
              </span>
            </label>
          ))}
          {visible.length === 0 && stale === null ? (
            <p className={styles.empty}>
              {needle === "" ? "No one can be picked right now." : "No one matches that search."}
            </p>
          ) : null}
        </div>
      </fieldset>
      {viewerNote !== null ? (
        <p className={styles.notice} role="note">
          {viewerNote}
        </p>
      ) : null}
    </div>
  );
}

/** The invite flow has no member to exclude — only active people. */
function activeMembers(members: MemberRow[]): MemberRow[] {
  if (!Array.isArray(members)) return [];
  return members
    .filter((member) => member.status === "active")
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
}
