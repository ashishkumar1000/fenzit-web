import { Form, Link } from "react-router";
import { Button } from "../../../components/ui/Button";
import type { EditBundle } from "../approvalLoaders";
import styles from "./PendingJobEditForm.module.css";

/**
 * The owner's edit form for a pending job (Epic 22, CAP-5): every field the
 * creator could set. The save posts to the queue's action (`intent=
 * edit-save`); the backend records each changed field in the audit trail and
 * refuses the save when the job has stopped being pending.
 *
 * Times use `datetime-local` inputs; they convert to UTC ISO on submit. The
 * start may not be in the past (the backend refuses it with a 422).
 */

function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PendingJobEditForm({
  bundle,
  busy,
  saved,
  error,
}: {
  bundle: EditBundle;
  busy: boolean;
  saved: boolean;
  error: string | null;
}) {
  const { job } = bundle;
  // The job's own customer, assignee and skill stay selectable even when the
  // picker list failed or holds none of them — otherwise an untouched save
  // would submit "" and silently clear the field.
  const customers = withCurrent(bundle.customers, job.customerId, job.customerName);
  const technicians = withCurrent(bundle.technicians, job.technicianId, job.technicianName);
  const skills = withCurrent(bundle.skills, job.skill?.id ?? null, job.skill?.name ?? null);

  return (
    <Form method="post" className={styles.form}>
      <input type="hidden" name="intent" value="edit-save" />
      <input type="hidden" name="jobId" value={job.id} />
      <h3 className={styles.title}>Edit {job.jobNumber}</h3>
      <p className={styles.hint}>
        The employee is told about every change you save. Your edits stay visible on the job.
      </p>
      {saved ? (
        <p className={styles.saved} role="status">
          Changes saved.
        </p>
      ) : null}
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      {bundle.skillsFailed ? (
        <p className={styles.pickerWarn} role="status">
          The skill list could not load — the job keeps its current skill unless you pick another.
        </p>
      ) : null}
      {bundle.customersFailed ? (
        <p className={styles.pickerWarn} role="status">
          The customer list could not load — the job keeps its current customer.
        </p>
      ) : null}

      <label className={styles.field}>
        <span className={styles.label}>What needs doing</span>
        <textarea name="description" rows={3} defaultValue={job.description} required />
      </label>

      <div className={styles.fieldRow}>
        <label className={styles.field}>
          <span className={styles.label}>Starts</span>
          <input
            type="datetime-local"
            name="scheduledStart"
            defaultValue={isoToLocalInput(job.scheduledStart)}
            required
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Ends (optional)</span>
          <input
            type="datetime-local"
            name="scheduledEnd"
            defaultValue={job.scheduledEnd === null ? "" : isoToLocalInput(job.scheduledEnd)}
          />
        </label>
      </div>

      <div className={styles.fieldRow}>
        <label className={styles.field}>
          <span className={styles.label}>Assign to</span>
          <select name="technicianId" defaultValue={job.technicianId ?? ""}>
            <option value="">Unassigned</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Priority</span>
          <select name="priority" defaultValue={job.priority ?? "normal"}>
            {/* A priority outside the two choices must show as it is — a select
                that silently normalises it would rewrite it on the next save. */}
            {job.priority !== null &&
            job.priority !== "" &&
            job.priority !== "normal" &&
            job.priority !== "urgent" ? (
              <option value={job.priority}>{job.priority}</option>
            ) : null}
            <option value="normal">Normal</option>
            <option value="urgent">Urgent</option>
          </select>
        </label>
      </div>

      <label className={styles.field}>
        <span className={styles.label}>Where</span>
        <input type="text" name="serviceLocation" defaultValue={job.serviceLocation} required />
      </label>

      <div className={styles.fieldRow}>
        <label className={styles.field}>
          <span className={styles.label}>Skill</span>
          <select name="skillId" defaultValue={job.skill?.id ?? ""}>
            <option value="">No skill</option>
            {skills.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Customer</span>
          <select name="customerId" defaultValue={job.customerId}>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className={styles.field}>
        <span className={styles.label}>Notes for the employee (optional)</span>
        <textarea name="notesForTechnician" rows={2} defaultValue={job.notesForTechnician ?? ""} />
      </label>

      <div className={styles.actions}>
        <Button variant="primary" size="regular" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save changes"}
        </Button>
        <Link to="/admin/company/approvals" className={styles.backLink}>
          Back to the queue
        </Link>
      </div>
    </Form>
  );
}

/** The job's own value stays selectable even when the picker list does not
 *  hold it (a failed list, an inactive employee, a retired skill). */
function withCurrent(
  options: Array<{ id: string; name: string }>,
  currentId: string | null,
  currentName: string | null,
): Array<{ id: string; name: string }> {
  if (currentId === null || currentId === "" || options.some((o) => o.id === currentId)) {
    return options;
  }
  return [{ id: currentId, name: currentName ?? "(the job's current value)" }, ...options];
}
