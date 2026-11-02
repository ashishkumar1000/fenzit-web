import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import type {
  adminDeletionAction,
  adminDeletionLoader,
} from "../features/admin/adminDeletionLoaders";
import type { DeletionRequestRow } from "../features/admin/deletionRequestsApi";
import { SectionCard } from "../features/admin/components/SectionCard";
import { fmtWhen } from "../features/admin/format";
import styles from "./AdminDeletionRequestsPage.module.css";

/** The page holds up to 50 open requests; the BE returns the oldest 50 first. */
const QUEUE_LIMIT = 50;

/**
 * Staff queue of open account deletion requests. Marking one done records the
 * review only; the account and its data are not removed from this screen.
 */
export function AdminDeletionRequestsPage() {
  const data = useLoaderData<typeof adminDeletionLoader>();
  const result = useActionData<typeof adminDeletionAction>();
  const navigation = useNavigation();

  if (data.state === "failed") {
    return (
      <SectionCard title="Deletion requests">
        <p className={styles.alert} role="alert">
          The request list could not load. Refresh the page to try again.
        </p>
      </SectionCard>
    );
  }

  const pendingId =
    navigation.state === "submitting" ? String(navigation.formData?.get("requestId") ?? "") : "";
  const actionError =
    result?.state === "error" && !data.rows.some((r) => r.id === result.requestId)
      ? result.message
      : null;

  return (
    <SectionCard title="Deletion requests" meta={String(data.rows.length)}>
      <p className={styles.note}>
        Marking a request done records your review only. It does not delete the account or its data
        yet.
      </p>
      {navigation.state === "loading" ? <p className={styles.quiet}>Loading requests…</p> : null}
      {actionError ? (
        <p className={styles.alert} role="alert">
          {actionError}
        </p>
      ) : null}
      {data.rows.length === 0 ? (
        <p className={styles.quiet}>No requests are waiting. New requests appear here.</p>
      ) : (
        <ul className={styles.list}>
          {data.rows.map((row) => (
            <RequestItem
              key={row.id}
              row={row}
              busy={pendingId === row.id}
              error={
                result?.state === "error" && result.requestId === row.id ? result.message : null
              }
            />
          ))}
        </ul>
      )}
      {data.rows.length >= QUEUE_LIMIT ? (
        <p className={styles.quiet}>Showing the oldest {QUEUE_LIMIT} open requests.</p>
      ) : null}
    </SectionCard>
  );
}

function RequestItem({
  row,
  busy,
  error,
}: {
  row: DeletionRequestRow;
  busy: boolean;
  error: string | null;
}) {
  // Screen reader users hear which request each button belongs to.
  const who = row.name?.trim() || `number ending ${row.phoneNumber.slice(-4)}`;
  return (
    <li className={styles.item}>
      <div className={styles.details}>
        <p className={styles.name}>{row.name?.trim() || "No name on this account"}</p>
        <p className={styles.quiet}>
          +{row.countryCode.replace(/^\+/, "")} {row.phoneNumber} · requested{" "}
          {fmtWhen(row.requestedAt)}
        </p>
        {error ? (
          <p className={styles.alert} role="alert">
            {error}
          </p>
        ) : null}
        <div className={styles.actions}>
          <Form method="post" className={styles.inline}>
            <input type="hidden" name="requestId" value={row.id} />
            <button
              type="submit"
              name="action"
              value="complete"
              className={styles.button}
              aria-label={`Mark request from ${who} as done`}
              disabled={busy}
            >
              {busy ? "Saving…" : "Mark as done"}
            </button>
          </Form>
          <Form method="post" className={styles.inline}>
            <input type="hidden" name="requestId" value={row.id} />
            <button
              type="submit"
              name="action"
              value="reject"
              className={styles.quietButton}
              aria-label={`Reject request from ${who}`}
              disabled={busy}
            >
              Reject request
            </button>
          </Form>
        </div>
      </div>
    </li>
  );
}
