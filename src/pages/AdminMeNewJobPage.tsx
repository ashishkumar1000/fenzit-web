import {
  Link,
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
  useRevalidator,
} from "react-router";
import { useState } from "react";
import type { CreateJobResult } from "../features/admin/meCreateJobLoaders";
import type { NewJobFormData } from "../features/admin/meCreateJobLoaders";
import { SectionCard } from "../features/admin/components/SectionCard";
import { Button } from "../components/ui/Button";
import styles from "./AdminMeNewJobPage.module.css";

/**
 * The employee's "New job" page on the web console (Epic 22, CAP-2): a job
 * for an existing customer, or a new customer and the job in one flow. The
 * backend routes it — with approval on it waits ("waiting for approval"),
 * with approval off it is assigned to the employee at once.
 *
 * A caller without the create switch sees the refusal, not a form.
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
        <Link to="/admin/me" className={styles.back}>
          Back to my dashboard
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
        <Link to="/admin/me" className={styles.back}>
          Back to my dashboard
        </Link>
      </SectionCard>
    );
  }

  // A required picker that failed would make every submit bounce off the
  // backend — hold the button until the lists are available.
  const pickersReady = data.skills.ok && (customerKind === "new" || data.customers.ok);
  const blocked = !pickersReady || creating;

  return (
    <SectionCard title="New job">
      {action?.state === "done" ? (
        <div className={styles.outcome} role="status">
          <p className={styles.outcomeTitle}>
            {action.pendingApproval
              ? `${action.job.jobNumber} created — waiting for your owner's approval.`
              : `${action.job.jobNumber} created and assigned to you.`}
          </p>
          <Link to="/admin/me" className={styles.back}>
            Back to my dashboard
          </Link>
          <Link to="/admin/me/new-job" className={styles.back}>
            Create another job
          </Link>
        </div>
      ) : (
        <Form method="post" className={styles.form}>
          <input type="hidden" name="idempotencyKey" value={data.idempotencyKey} />
          <p className={styles.hint}>
            Your owner sees every job you create
            {" — "}the approval rule they set for you decides whether it waits for them first.
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
            <span className={styles.label}>Notes for your owner (optional)</span>
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
