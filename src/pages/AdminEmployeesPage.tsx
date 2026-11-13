import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import { useId, useRef, useState } from "react";
import type { adminEmployeesLoader } from "../features/admin/adminBrowseLoaders";
import type { JobSettingsResult } from "../features/admin/adminBrowseLoaders";
import { humanize } from "../features/admin/status";
import { SectionCard } from "../features/admin/components/SectionCard";
import { DataTable, type TableCell } from "../features/admin/components/Table";
import { fmtDay, fmtPhone } from "../features/admin/format";
import styles from "./AdminEmployeesPage.module.css";

const ROLE_LABEL: Record<string, string> = {
  company_admin: "Owner",
  employee: "Employee",
  viewer: "Viewer",
};

/**
 * The full team, alphabetically by join order. Each employee row carries a
 * "Job settings" control (Epic 22, CAP-1): the two owner-set switches — may
 * this employee create jobs, and do those jobs need approval first. A change
 * applies to the next job they create; jobs already pending keep their state.
 */

export function AdminEmployeesPage() {
  const data = useLoaderData<typeof adminEmployeesLoader>();
  const action = useActionData<JobSettingsResult>();

  if (data.state === "failed") {
    return (
      <SectionCard title="Employees">
        <p className={styles.failed} role="alert">
          The team list could not load. Use the sidebar to retry this page.
        </p>
      </SectionCard>
    );
  }

  const actionError = action?.state === "error" ? action.message : null;

  return (
    <>
      {actionError ? (
        <p className={styles.actionError} role="alert">
          {actionError}
        </p>
      ) : null}
      <SectionCard title="Employees" meta={String(data.rows.length)}>
        <DataTable
          columns={["Name", "Phone", "Code", "Role", "Status", "Job settings", "Joined"]}
          empty="Nobody on the team yet."
          rows={data.rows.map((m): TableCell[] => [
            { text: m.name ?? "(no name)" },
            { text: fmtPhone(m.countryCode, m.phoneNumber), quiet: true },
            { text: m.employeeCode },
            { text: ROLE_LABEL[m.role] ?? humanize(m.role) },
            { text: m.status, status: true },
            m.role === "employee"
              ? {
                  text: "Change job settings",
                  node: <JobSettingsCell key={m.userId} row={m} />,
                }
              : { text: "—" },
            { text: fmtDay(m.createdAt), quiet: true },
          ])}
        />
      </SectionCard>
    </>
  );
}

/** The row's settings control: a summary of the two switches that opens the
 *  change form. Employees only — owners and viewers do not create jobs. */
function JobSettingsCell({
  row,
}: {
  row: { userId: string; canCreateJobs: boolean; jobApprovalRequired: boolean };
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const action = useActionData<JobSettingsResult>();
  const navigation = useNavigation();
  const label = row.canCreateJobs
    ? row.jobApprovalRequired
      ? "Create + approval"
      : "Create"
    : "Off";
  const busy =
    navigation.state === "submitting" && navigation.formData?.get("userId") === row.userId;
  const saved = action?.state === "done" && action.userId === row.userId;
  const error = action?.state === "error" && action.userId === row.userId ? action.message : null;
  // The mark belongs to the save that produced it. React's render-phase state
  // adjustment: when a new action arrives, adopt it — so reopening the dialog
  // with an old action does not claim "Saved." again, and a fresh save does.
  const [seenAction, setSeenAction] = useState<unknown>(null);
  const [markVisible, setMarkVisible] = useState(false);
  if (action !== seenAction) {
    setSeenAction(action);
    setMarkVisible(saved);
  }
  return (
    <span className={styles.settingsCell}>
      <button
        type="button"
        className={styles.settingsButton}
        onClick={() => {
          if (dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
        }}
        aria-haspopup="dialog"
      >
        {label}
      </button>
      {/* A native dialog: modal focus, Escape-to-close and the dimmed backdrop
          come from the element; a click on the backdrop also closes it. The
          dialog stays open after a save so the "Saved." line is seen. */}
      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby={titleId}
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current?.close();
        }}
      >
        <Form method="post" className={styles.dialogForm}>
          <input type="hidden" name="userId" value={row.userId} />
          <h3 id={titleId} className={styles.dialogTitle}>
            Job settings
          </h3>
          <p className={styles.dialogHint}>
            Changes apply to the next job this employee creates. Jobs already waiting keep their
            state.
          </p>
          <label className={styles.switchRow}>
            <input type="checkbox" name="canCreateJobs" defaultChecked={row.canCreateJobs} />
            <span>
              Can create jobs
              <small>They log their own visits and tasks.</small>
            </span>
          </label>
          <label className={styles.switchRow}>
            <input
              type="checkbox"
              name="jobApprovalRequired"
              defaultChecked={row.jobApprovalRequired}
            />
            <span>
              Approval needed
              <small>New jobs wait for your approval first.</small>
            </span>
          </label>
          {error ? (
            <p className={styles.dialogError} role="alert">
              {error}
            </p>
          ) : null}
          <div className={styles.dialogActions}>
            {markVisible ? (
              <p className={styles.savedMark} role="status">
                Saved.
              </p>
            ) : null}
            <button
              type="button"
              className={styles.quietButton}
              onClick={() => dialogRef.current?.close()}
            >
              Cancel
            </button>
            <button type="submit" className={styles.saveButton} disabled={busy === true}>
              {busy === true ? "Saving…" : "Save"}
            </button>
          </div>
        </Form>
      </dialog>
    </span>
  );
}
