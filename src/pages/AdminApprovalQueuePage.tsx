import {
  Link,
  Form,
  useActionData,
  useLoaderData,
  useLocation,
  useNavigation,
  useSearchParams,
} from "react-router";
import type { approvalQueueLoader } from "../features/admin/approvalLoaders";
import type { DecisionResult } from "../features/admin/approvalLoaders";
import { SectionCard } from "../features/admin/components/SectionCard";
import { PendingJobEditForm } from "../features/admin/components/PendingJobEditForm";
import { RejectDialog } from "../features/admin/components/RejectDialog";
import { fmtDay, istDateInput } from "../features/admin/format";
import styles from "./AdminApprovalQueuePage.module.css";

/**
 * The owner's approval queue (Epic 22, CAP-5/CAP-10): every pending employee
 * job, oldest submission first, filterable by employee and submission age —
 * the filters combine (both ride the URL, so they are plain navigation).
 * Approve and reject post straight to the page's action; edit opens the job's
 * form via `?edit=<jobId>` and the loader fetches it with its picker options.
 * `?cursor=` walks to the next page of the queue when one page is not enough.
 *
 * A failed decision keeps its error line beside the row it belonged to; a
 * JOB_NOT_PENDING (someone decided it first) says the list has moved on.
 */

const AGE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Any age" },
  { value: "24", label: "Older than 24 hours" },
  { value: "72", label: "Older than 3 days" },
  { value: "168", label: "Older than 7 days" },
];

type QueueData = Extract<Awaited<ReturnType<typeof approvalQueueLoader>>, { state: "ok" }>;

export function AdminApprovalQueuePage() {
  const data = useLoaderData<typeof approvalQueueLoader>();

  if (data.state === "failed") {
    return (
      <SectionCard title="Approval queue">
        <p className={styles.failed} role="alert">
          The approval queue could not load.
          <RetryHere />
        </p>
      </SectionCard>
    );
  }

  return (
    <div className={styles.stack}>
      <FilterBar data={data} />
      {data.edit !== null && data.editId !== null ? <EditBlock data={data} /> : null}
      <QueueBlock data={data} />
    </div>
  );
}

function FilterBar({ data }: { data: QueueData }) {
  const [searchParams, setSearchParams] = useSearchParams();
  return (
    <SectionCard title="Filter">
      {data.members.ok ? (
        <div className={styles.filterRow}>
          <label className={styles.filterField}>
            <span className={styles.filterLabel}>Employee</span>
            <select
              value={data.filters.employeeId}
              onChange={(event) => {
                const next = new URLSearchParams(searchParams);
                if (event.target.value === "") next.delete("employeeId");
                else next.set("employeeId", event.target.value);
                setSearchParams(next, { preventScrollReset: true });
              }}
            >
              <option value="">All employees</option>
              {data.members.data
                .filter((m) => m.role === "employee")
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name ?? "(no name)"}
                  </option>
                ))}
              {/* A hand-set or stale employeeId (a removed employee) must stay
                  visible and clearable — not silently read as "All". */}
              {data.filters.employeeId !== "" &&
              !data.members.data.some((m) => m.id === data.filters.employeeId) ? (
                <option value={data.filters.employeeId}>(this employee)</option>
              ) : null}
            </select>
          </label>
          <label className={styles.filterField}>
            <span className={styles.filterLabel}>Age of submission</span>
            <select
              value={
                data.filters.olderThanHours === null ? "" : String(data.filters.olderThanHours)
              }
              onChange={(event) => {
                const next = new URLSearchParams(searchParams);
                if (event.target.value === "") next.delete("olderThan");
                else next.set("olderThan", event.target.value);
                setSearchParams(next, { preventScrollReset: true });
              }}
            >
              {AGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : (
        <p className={styles.quiet}>
          The employee filter could not load.
          {data.filters.employeeId !== ""
            ? " The employee filter already in the address still applies."
            : ""}
        </p>
      )}
    </SectionCard>
  );
}

function EditBlock({ data }: { data: QueueData }) {
  const action = useActionData<DecisionResult>();
  const navigation = useNavigation();
  const editId = data.editId;
  const edit = data.edit;
  if (editId === null || edit === null) return null;

  const busy =
    navigation.state === "submitting" &&
    navigation.formData?.get("jobId") === editId &&
    navigation.formData?.get("intent") === "edit-save";
  const saved = action?.state === "done" && action.jobId === editId;
  const error = action?.state === "error" && action.jobId === editId ? action.message : null;

  if (!edit.ok) {
    return (
      <SectionCard title="Edit pending job">
        <p className={styles.failed} role="alert">
          That job could not load for editing.{" "}
          <Link to="/admin/company/approvals" className={styles.retry}>
            Back to the queue
          </Link>
        </p>
      </SectionCard>
    );
  }

  // A job decided while the link sat in the address bar must not offer a full
  // form whose every save the backend would refuse.
  if (edit.data.job.status !== "pending_approval") {
    return (
      <SectionCard title="Edit pending job">
        <p className={styles.failed} role="alert">
          That job is no longer waiting for approval.{" "}
          <Link to="/admin/company/approvals" className={styles.retry}>
            Back to the queue
          </Link>
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Edit pending job">
      <PendingJobEditForm bundle={edit.data} busy={busy === true} saved={saved} error={error} />
    </SectionCard>
  );
}

function QueueBlock({ data }: { data: QueueData }) {
  const action = useActionData<DecisionResult>();
  const navigation = useNavigation();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();

  if (!data.queue.ok) {
    return (
      <SectionCard title="Approval queue">
        <p className={styles.failed} role="alert">
          The queue could not load.
          <RetryHere />
        </p>
      </SectionCard>
    );
  }

  // A navigation aimed at this page (a filter change) refetches the list; the
  // previous rows stay on screen until the new ones arrive.
  const updating =
    navigation.state === "loading" &&
    navigation.location.pathname === pathname &&
    pathname === "/admin/company/approvals";
  const rows = data.queue.data.data;
  // A decision on a job that is no longer in the list (someone decided it
  // first) would otherwise flash on a row that revalidation just removed —
  // keep the news at page level until the next navigation clears it.
  const strayError =
    action?.state === "error" && !rows.some((row) => row.id === action.jobId)
      ? action.message
      : null;
  const olderParams = new URLSearchParams(searchParams);
  olderParams.delete("edit");
  if (data.queue.data.nextCursor !== null) {
    olderParams.set("cursor", data.queue.data.nextCursor);
  }
  return (
    <SectionCard
      title="Approval queue"
      meta={data.queue.data.hasMore ? `${rows.length}+` : String(rows.length)}
    >
      {updating ? (
        <p className={styles.moreLine} role="status">
          Updating the list…
        </p>
      ) : null}
      {strayError !== null ? (
        <p className={styles.rowError} role="alert">
          {strayError}
        </p>
      ) : null}
      {rows.length === 0 ? (
        <p className={styles.quiet}>
          Nothing is waiting for approval
          {data.filters.employeeId !== "" || data.filters.olderThanHours !== null
            ? " for these filters"
            : ""}
          .
        </p>
      ) : (
        <ul className={styles.queueList}>
          {rows.map((row) => {
            // Only a decide submission may disable this row's own buttons —
            // an edit-save on the open form must not freeze the queue.
            const busy =
              navigation.state === "submitting" &&
              navigation.formData?.get("jobId") === row.id &&
              navigation.formData?.get("intent") === "decide";
            const error =
              action?.state === "error" && action.jobId === row.id ? action.message : null;
            const editing = row.id === data.editId;
            return (
              <li key={row.id} className={styles.row}>
                <div className={styles.rowMain}>
                  <p className={styles.rowTitle}>
                    {row.jobNumber}
                    {editing ? <span className={styles.editingMark}> · being edited</span> : null}
                    {row.customerName !== null ? ` · ${row.customerName}` : ""}
                  </p>
                  <p className={styles.rowMeta}>
                    {row.employee?.name ?? "(no name)"} · submitted {dayOf(row.submittedAt)} ·
                    waiting {row.ageHours} h
                  </p>
                  {error ? (
                    <p className={styles.rowError} role="alert">
                      {error}
                    </p>
                  ) : null}
                </div>
                <div className={styles.rowActions}>
                  <Link to={`/admin/company/approvals?edit=${row.id}`} className={styles.editLink}>
                    Edit
                  </Link>
                  <Form method="post" className={styles.inlineForm}>
                    <input type="hidden" name="intent" value="decide" />
                    <input type="hidden" name="jobId" value={row.id} />
                    <input type="hidden" name="decision" value="approve" />
                    <button type="submit" className={styles.approveButton} disabled={busy === true}>
                      {busy === true ? "Working…" : "Approve"}
                    </button>
                  </Form>
                  <RejectDialog jobId={row.id} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {data.queue.data.hasMore && data.queue.data.nextCursor !== null ? (
        <p className={styles.moreLine}>
          <Link to={`/admin/company/approvals?${olderParams.toString()}`} className={styles.retry}>
            Older submissions
          </Link>{" "}
          continue on the next page of the queue — the oldest always lead.
        </p>
      ) : null}
    </SectionCard>
  );
}

/** A submitted-at instant as its IST calendar day ("14 Nov 2026"). */
function dayOf(iso: string): string {
  const ist = istDateInput(iso);
  return ist === "" ? "—" : fmtDay(ist);
}

/** A link back to the exact same address — navigating re-runs the loader, so
 *  a failed load can be retried without touching the filters in the URL. */
function RetryHere() {
  const { pathname, search } = useLocation();
  return (
    <Link to={`${pathname}${search}`} className={styles.retry}>
      Try again
    </Link>
  );
}
