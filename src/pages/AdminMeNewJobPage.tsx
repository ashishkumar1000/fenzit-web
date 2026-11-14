import {
  Link,
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
  useRevalidator,
  useRouteLoaderData,
} from "react-router";
import { useState } from "react";
import type { adminLoader } from "../features/admin/adminLoader";
import type { CreateJobResult } from "../features/admin/meCreateJobLoaders";
import type { NewJobFormData } from "../features/admin/meCreateJobLoaders";
import { SectionCard } from "../features/admin/components/SectionCard";
import { Button } from "../components/ui/Button";
import styles from "./AdminMeNewJobPage.module.css";

/**
 * The "New job" page on the web console (Epic 22, CAP-2) — one form for both
 * roles: an employee creates a job for an existing customer, or a new
 * customer and the job in one flow, and the backend routes it — with
 * approval on it waits ("waiting for approval"), with approval off it is
 * assigned to the employee at once. An owner creates for any customer and
 * assigns any active employee from the picker.
 *
 * A member without the create switch sees the refusal, not a form.
 */

/** Local `datetime-local` value for "now, rounded up to the hour". */
function defaultStart(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AdminMeNewJobPage() {
  const data = useLoaderData<NewJobFormData>();
  const action = useActionData<CreateJobResult>();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const creating = navigation.state === "submitting";
  const [customerKind, setCustomerKind] = useState<"existing" | "new">("existing");
  // The failed form data carries no role (the loader's own /users/me call is
  // what failed), so the failed branch reads the layout's role instead.
  const layout = useRouteLoaderData<typeof adminLoader>("admin");
  const owner =
    data.state === "ok"
      ? data.role === "owner"
      : layout !== undefined && layout.status === "ok" && layout.role === "owner";
  // The back and self links follow the role: a member's console home is Me,
  // an owner's is the shared jobs page.
  const backTo = owner ? "/admin/company/jobs" : "/admin/me";
  const selfRoute = owner ? "/admin/company/jobs/new" : "/admin/me/new-job";

  if (data.state === "failed") {
    return (
      <SectionCard title="New job">
        <p className={styles.refusal} role="alert">
          The new-job form could not load.
          <button
            type="button"
            className={styles.retry}
            onClick={() => revalidator.revalidate()}
            disabled={revalidator.state !== "idle"}
          >
            {revalidator.state !== "idle" ? "Retrying…" : "Retry"}
          </button>
        </p>
        <Link to={backTo} className={styles.back}>
          Back
        </Link>
      </SectionCard>
    );
  }

  if (!data.canCreateJobs) {
    return (
      <SectionCard title="New job">
        <p className={styles.refusal} role="alert">
          You are not allowed to create jobs. Ask your owner to turn this on for you.
        </p>
        <Link to={backTo} className={styles.back}>
          Back
        </Link>
      </SectionCard>
    );
  }

  // A required picker that failed would make every submit bounce off the
  // backend — hold the button until the lists are available. An owner with
  // nobody to assign to is held too: the line above the held button says why.
  const pickersReady =
    data.skills.ok &&
    (customerKind === "new" || data.customers.ok) &&
    (!owner || (data.technicians.ok && data.technicians.data.length > 0));
  const blocked = !pickersReady || creating;

  return (
    <SectionCard title="New job">
      {action?.state === "done" ? (
        <div className={styles.outcome} role="status">
          <p className={styles.outcomeTitle}>
            {owner
              ? action.pendingApproval
                ? `${action.job.jobNumber} created — waiting for approval.`
                : `${action.job.jobNumber} created and assigned.`
              : action.pendingApproval
                ? `${action.job.jobNumber} created — waiting for your owner's approval.`
                : `${action.job.jobNumber} created and assigned to you.`}
          </p>
          <Link to={backTo} className={styles.back}>
            Back
          </Link>
          <Link to={selfRoute} className={styles.back}>
            Create another job
          </Link>
        </div>
      ) : (
        <Form method="post" className={styles.form}>
          <input type="hidden" name="idempotencyKey" value={data.idempotencyKey} />
          <p className={styles.hint}>
            {owner
              ? "The employee you assign sees the job in their app at once."
              : "Your owner sees every job you create — the approval rule they set for you decides whether it waits for them first."}
          </p>
          {action?.state === "error" ? (
            <p className={styles.error} role="alert">
              {action.message}
            </p>
          ) : null}

          <label className={styles.field}>
            <span className={styles.label}>What needs doing</span>
            <textarea name="description" rows={3} required />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Who is it for</span>
            <select
              name="customerKind"
              value={customerKind}
              onChange={(event) =>
                setCustomerKind(event.target.value === "new" ? "new" : "existing")
              }
            >
              <option value="existing">An existing customer</option>
              <option value="new">A new customer</option>
            </select>
          </label>

          {customerKind === "existing" ? (
            <label className={styles.field}>
              <span className={styles.label}>Customer</span>
              {data.customers.ok ? (
                <select name="customerId" required>
                  <option value="">Pick a customer</option>
                  {data.customers.data.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p className={styles.quiet}>
                  The customer list could not load. Refresh the page to retry.
                </p>
              )}
            </label>
          ) : (
            <div className={styles.newCustomer}>
              <label className={styles.field}>
                <span className={styles.label}>Customer name</span>
                <input type="text" name="newCustomerName" maxLength={120} required />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Phone number (India)</span>
                <input
                  type="tel"
                  name="newCustomerPhone"
                  pattern="\d{6,15}"
                  title="6 to 15 digits, no spaces"
                  required
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Address (optional)</span>
                <input type="text" name="newCustomerAddress" />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>City (optional)</span>
                <input type="text" name="newCustomerCity" />
              </label>
            </div>
          )}

          {owner ? (
            <label className={styles.field}>
              <span className={styles.label}>Assign to</span>
              {data.technicians.ok ? (
                data.technicians.data.length === 0 ? (
                  // An owner with nobody to assign to must know why the
                  // submit is stuck, not face a select with one placeholder.
                  <p className={styles.quiet}>
                    No active employees to assign yet. Add employees first.
                  </p>
                ) : (
                  <select name="technicianId" required defaultValue="">
                    <option value="">Pick an employee</option>
                    {data.technicians.data.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                )
              ) : (
                <p className={styles.quiet}>
                  The employee list could not load. Refresh the page to retry.
                </p>
              )}
            </label>
          ) : null}

          <label className={styles.field}>
            <span className={styles.label}>What needs doing (skill)</span>
            {data.skills.ok ? (
              <select name="skillId" required defaultValue="">
                <option value="">Pick a skill</option>
                {data.skills.data.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className={styles.quiet}>
                The skill list could not load. Refresh the page to retry.
              </p>
            )}
          </label>

          <div className={styles.fieldRow}>
            <label className={styles.field}>
              <span className={styles.label}>Starts</span>
              <input
                type="datetime-local"
                name="scheduledStart"
                defaultValue={defaultStart()}
                required
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Ends (optional)</span>
              <input type="datetime-local" name="scheduledEnd" />
            </label>
          </div>

          <label className={styles.field}>
            <span className={styles.label}>Priority</span>
            <select name="priority" defaultValue="normal">
              <option value="normal">Normal</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Where</span>
            <input type="text" name="serviceLocation" maxLength={500} required />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>
              {owner ? "Notes for the employee (optional)" : "Notes for your owner (optional)"}
            </span>
            <textarea name="notesForTechnician" rows={2} />
          </label>

          {!pickersReady ? (
            <p className={styles.quiet}>
              The Create button is held until the lists above load. Refresh the page to retry.
            </p>
          ) : null}

          <div className={styles.actions}>
            <Button variant="primary" size="regular" type="submit" disabled={blocked}>
              {creating ? "Creating…" : "Create job"}
            </Button>
          </div>
        </Form>
      )}
    </SectionCard>
  );
}
