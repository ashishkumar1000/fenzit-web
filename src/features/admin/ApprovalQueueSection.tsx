import {
  Link,
  Form,
  useActionData,
  useLocation,
  useNavigation,
  useSearchParams,
} from "react-router";
import type { DecisionResult, QueueState } from "./approvalLoaders";
import type { Slice } from "./slice";
import { SectionCard } from "./components/SectionCard";
import { PendingJobEditForm } from "./components/PendingJobEditForm";
import { RejectDialog } from "./components/RejectDialog";
import { Button } from "../../components/ui/Button";
import { fmtDay, fmtWhen, istDateInput, waitLabel } from "./format";
import styles from "./ApprovalQueueSection.module.css";

/**
 * The owner's approval queue (Epic 22, CAP-5/CAP-10) as a section of the
 * shared jobs page: every pending employee job, oldest submission first,
 * filterable by employee and submission age — the filters combine (both ride
 * the URL, so they are plain navigation). Approve and reject post straight to
 * the page's action; edit opens the job's form via `?edit=<jobId>` and the
 * loader fetches it with its picker options. `?cursor=` walks to the next
 * page of the queue when one page is not enough.
 *
 * A failed decision keeps its error line beside the row it belonged to; a
 * JOB_NOT_PENDING (someone decided it first) says the list has moved on.
 */

const AGE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Any Time" },
  { value: "24", label: "More Than 24 Hours Ago" },
  { value: "72", label: "More Than 3 Days Ago" },
  { value: "168", label: "More Than 7 Days Ago" },
];

export function ApprovalQueueSection({
  data,
  basePath,
}: {
  data: Slice<QueueState>;
  /** The page the queue lives on — the filters, the edit link and the paging
   *  are plain navigation on that address. */
  basePath: string;
}) {
  if (!data.ok) {
    return (
      <SectionCard title="Jobs Waiting for Approval">
        <p className={styles.failed} role="alert">
          We could not load the jobs waiting for approval.
          <RetryHere />
        </p>
      </SectionCard>
    );
  }
  return (
    <div className={styles.stack}>
      <FilterBar data={data.data} />
      {data.data.edit !== null && data.data.editId !== null ? (
        <EditBlock data={data.data} basePath={basePath} />
      ) : null}
      <QueueBlock data={data.data} basePath={basePath} />
    </div>
  );
}

function FilterBar({ data }: { data: QueueState }) {
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
              <option value="">All Employees</option>
              {data.members.data
                .filter((m) => m.role === "employee")
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name ?? "No Name"}
                  </option>
                ))}
              {/* A hand-set or stale employeeId (a removed employee) must stay
                  visible and clearable — not silently read as "All". The
                  check mirrors the picker's own filter: a non-employee id in
                  the URL is just as invisible without this line. */}
              {data.filters.employeeId !== "" &&
              !data.members.data.some(
                (m) => m.id === data.filters.employeeId && m.role === "employee",
              ) ? (
                <option value={data.filters.employeeId}>This Employee</option>
              ) : null}
            </select>
          </label>
          <label className={styles.filterField}>
            <span className={styles.filterLabel}>How Long Ago Was the Job Submitted?</span>
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
          We could not load the employee list. The selected filter will still be used.
        </p>
      )}
    </SectionCard>
  );
}

function EditBlock({ data, basePath }: { data: QueueState; basePath: string }) {
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
      <SectionCard title="Edit Job">
        <p className={styles.failed} role="alert">
          We could not load this job for editing.{" "}
          <Link to={basePath + "?tab=approval"} className={styles.retry}>
            Back to Approval List
          </Link>
        </p>
      </SectionCard>
    );
  }

  // A job decided while the link sat in the address bar must not offer a full
  // form whose every save the backend would refuse.
  if (edit.data.job.status !== "pending_approval") {
    return (
      <SectionCard title="Edit Job">
        <p className={styles.failed} role="alert">
          This job is no longer waiting for approval.{" "}
          <Link to={basePath + "?tab=approval"} className={styles.retry}>
            Back to Approval List
          </Link>
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Edit Job">
      <PendingJobEditForm bundle={edit.data} busy={busy === true} saved={saved} error={error} />
    </SectionCard>
  );
}

function QueueBlock({ data, basePath }: { data: QueueState; basePath: string }) {
  const action = useActionData<DecisionResult>();
  const navigation = useNavigation();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();

  if (!data.queue.ok) {
    return (
      <SectionCard title="Jobs Waiting for Approval">
        <p className={styles.failed} role="alert">
          We could not load the jobs waiting for approval.
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
    pathname === basePath;
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
      title="Jobs Waiting for Approval"
      meta={
        data.queue.data.hasMore
          ? `${rows.length}+ Jobs Waiting`
          : `${rows.length} ${rows.length === 1 ? "Job" : "Jobs"} Waiting`
      }
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
          {data.filters.employeeId !== "" || data.filters.olderThanHours !== null
            ? "No jobs are waiting for approval with these filters."
            : "No jobs are waiting for approval."}
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
                    {row.description ? row.description : row.jobNumber}
                    {editing ? <span className={styles.editingMark}> · Being Edited</span> : null}
                    {row.description ? ` · ${row.jobNumber}` : ""}
                    {row.customerName !== null ? ` · ${row.customerName}` : ""}
                  </p>
                  <p className={styles.rowMeta}>
                    {row.employee?.name ?? "No Name"} · submitted {dayOf(row.submittedAt)} · waiting{" "}
                    {waitLabel(row.ageHours)}
                    {row.scheduledStart !== null
                      ? ` · scheduled ${fmtWhen(row.scheduledStart)}`
                      : ""}
                  </p>
                  {error ? (
                    <p className={styles.rowError} role="alert">
                      {error}
                    </p>
                  ) : null}
                </div>
                <div className={styles.rowActions}>
                  <Link to={`${basePath}?edit=${row.id}`} className={styles.editLink}>
                    Edit
                  </Link>
                  <Form method="post" className={styles.inlineForm}>
                    <input type="hidden" name="intent" value="decide" />
                    <input type="hidden" name="jobId" value={row.id} />
                    <input type="hidden" name="decision" value="approve" />
                    <Button type="submit" size="compact" disabled={busy === true}>
                      {busy === true ? "Working…" : "Approve"}
                    </Button>
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
          <Link to={`${basePath}?${olderParams.toString()}`} className={styles.retry}>
            View Older Requests
          </Link>{" "}
          Open the next page to see older requests. The oldest requests appear first.
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
      Try Again
    </Link>
  );
}
