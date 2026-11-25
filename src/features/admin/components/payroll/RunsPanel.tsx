import { Link, Form, useActionData, useFetcher, useNavigation, useRevalidator } from "react-router";
import { useId, useRef } from "react";
import { fmtDay, fmtWhen } from "../../format";
import type { adminPayrollAction } from "../../payrollAction";
import { fmtMoney } from "../../payrollFormat";
import type { PayrollMonthStatusView } from "../../payrollViews";
import type { LockView, OffCycleLineView, PayrollRunView } from "../../payrollRunApi";
import type { MemberRow } from "../../companyApi";
import { Spinner } from "../../../../components/ui/Spinner";
import dialogStyles from "../JobSettingsDialog.module.css";
import { OverrideControl } from "./OverrideDialog";
import { OffCycleList } from "./OffCycleList";
import styles from "./RunsPanel.module.css";

/**
 * The Runs tab: everything about one month — the resolved policy and its
 * run button, the run's status and summary, the lock (confirm dialog
 * quoting the BE's own permanence copy), the month's off-cycle lines
 * (read-only: staging writes need a BE addition), and the company's run
 * history. The status machine is async on the BE; a manual Refresh
 * revalidates the loader (no polling loop anywhere).
 */

const SKIP_LABELS: Record<string, string> = {
  missing_join_date: "Joining Date Missing",
  not_configured: "Salary Structure Missing",
  empty_window: "No Salary Due",
  never_enrolled: "PF / Other Benefit Not Added",
};

/** The divisor words the Calendar tab uses — no raw convention codes. */
const DIVISOR_WORDS: Record<string, string> = {
  calendar: "Actual days in the month",
  "fixed-30": "Fixed 30 days",
  "fixed-26": "Fixed 26 days",
};

/** A YYYY-MM month as the owner reads it — "October 2026". */
function fmtMonthHead(month: string): string {
  const [year, mon] = month.split("-").map(Number);
  if (!year || !mon) return month;
  return new Date(year, mon - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

type SliceOf<T> = { ok: true; data: T } | { ok: false };

export function RunsPanel({
  month,
  monthStatus,
  run,
  runStale,
  history,
  lock,
  offCycleLines,
  members,
}: {
  month: string;
  monthStatus: SliceOf<PayrollMonthStatusView>;
  run: PayrollRunView | null;
  runStale: boolean;
  history: PayrollRunView[];
  lock: SliceOf<LockView | null>;
  offCycleLines: SliceOf<OffCycleLineView[]>;
  members: SliceOf<MemberRow[]>;
}) {
  if (!monthStatus.ok || !lock.ok || !offCycleLines.ok || !members.ok) {
    return (
      <div className={styles.card}>
        <p className={styles.failed} role="alert">
          We could not load the salary details.
          <br />
          Please go back to the menu and open this page again.
        </p>
      </div>
    );
  }
  const status = monthStatus.data;
  return (
    <div className={styles.stack}>
      <p className={styles.panelLede}>
        Use this page to calculate employee salaries for a month.
        <br />
        You can check salary details, start salary calculations and see the results.
      </p>
      <MonthCard month={month} status={status} run={run} members={members.data} />
      {run !== null ? <RunCard run={run} /> : null}
      {run !== null && runStale ? (
        <div className={styles.card}>
          <p className={styles.hint} role="status">
            Salary calculation has been running for more than 15 minutes.
            <br />
            It may have stopped working.
            <br />
            You can start the salary calculation again. This will start a fresh calculation for the
            month.
          </p>
        </div>
      ) : null}
      {run !== null && run.status === "completed" ? <SummaryCard run={run} /> : null}
      {run !== null && run.status === "failed" && run.errorMessage !== null ? (
        <div className={styles.card}>
          <h2 className={styles.panelTitle}>Salary Calculation Failed</h2>
          <p className={styles.failedCopy} role="alert">
            {run.errorMessage}
          </p>
        </div>
      ) : null}
      <LockCard
        month={month}
        status={status}
        run={run}
        lock={lock.data}
        offCycleLines={offCycleLines.data}
      />
      <OffCycleList month={month} lines={offCycleLines.data} locked={status.locked} />
      <HistoryCard history={history} chosenMonth={month} />
    </div>
  );
}

function MonthCard({
  month,
  status,
  run,
  members,
}: {
  month: string;
  status: PayrollMonthStatusView;
  run: PayrollRunView | null;
  members: MemberRow[];
}) {
  const action = useActionData<typeof adminPayrollAction>();
  const busy = useNavigation().state !== "idle";
  const result = action !== undefined && isRunResult(action, "run-trigger") ? action : null;
  const inFlight = run?.status === "queued" || run?.status === "running";
  return (
    <div className={styles.card}>
      <div className={styles.monthHead}>
        <h2 className={styles.panelTitle}>{fmtMonthHead(month)}</h2>
        <Link
          to={`/admin/company/payroll?tab=calendar&month=${month}`}
          className={styles.calendarLink}
        >
          View Salary Calendar
        </Link>
      </div>
      <dl className={styles.policyFacts}>
        <div>
          <dt>Daily Salary Calculation</dt>
          <dd>{DIVISOR_WORDS[status.divisorConvention] ?? status.divisorConvention}</dd>
        </div>
        <div>
          <dt>Attendance Cut-off</dt>
          <dd>{status.cutoffDay}</dd>
        </div>
        <div>
          <dt>Salary Payment Date</dt>
          <dd>{status.payDate}</dd>
        </div>
        <div>
          <dt>Salary Rule Used</dt>
          <dd>
            {status.effectiveFrom === null
              ? "Default Settings"
              : `Rule from ${fmtDay(status.effectiveFrom)}`}
          </dd>
        </div>
        <div>
          <dt>First Month Salary Can Be Paid</dt>
          <dd>{status.firstPayrollMonth ?? "No employee joining date has been added yet."}</dd>
        </div>
        <div>
          <dt>Is This Month Locked?</dt>
          <dd>{status.locked ? "Yes" : "No"}</dd>
        </div>
      </dl>
      {status.notRunnableReason !== null ? (
        <p className={styles.hint} role="status">
          {status.notRunnableReason}
        </p>
      ) : null}
      {status.locked ? (
        <p className={styles.lockedLine} role="status">
          This month has been completed and locked.
          <br />
          Salary slips for this month are final and cannot be changed.
        </p>
      ) : (
        <>
          {inFlight ? (
            <InFlightLine run={run} />
          ) : (
            <OverrideControl month={month} members={members} />
          )}
          <Form method="post" className={styles.saveForm}>
            <input type="hidden" name="intent" value="run-trigger" />
            <input type="hidden" name="month" value={month} />
            {result?.state === "error" ? (
              <p className={styles.errorLine} role="alert">
                {result.message}
              </p>
            ) : null}
            <div className={styles.saveRow}>
              <button type="submit" className={styles.saveButton} disabled={busy}>
                {busy ? <Spinner size={13} /> : null}
                {busy
                  ? "Starting…"
                  : inFlight || run?.status === "failed"
                    ? "Calculate Again"
                    : "Calculate Salary"}
              </button>
            </div>
          </Form>
        </>
      )}
    </div>
  );
}

/** A queued/running run: the BE runs asynchronously, so the card says so
 *  and offers the revalidate — no polling loop. The run form below stays
 *  reachable: re-posting the month is the BE's own reclaim for a dead run
 *  (and is idempotent while one is genuinely still going). */
function InFlightLine({ run }: { run: PayrollRunView }) {
  const revalidator = useRevalidator();
  return (
    <div className={styles.inFlight}>
      <span className={styles.statusPill} data-status={run.status}>
        <span className={styles.statusDot} aria-hidden="true" />
        {run.status === "queued" ? "Waiting to Start" : "In Progress"}
      </span>
      <span className={styles.hint}>
        Salary calculation is running in the background.
        <br />
        Press Refresh to check the latest status.
      </span>
      <button
        type="button"
        className={styles.probeButton}
        onClick={() => {
          if (revalidator.state === "idle") void revalidator.revalidate();
        }}
        disabled={revalidator.state !== "idle"}
      >
        Refresh
      </button>
    </div>
  );
}

function RunCard({ run }: { run: PayrollRunView }) {
  const finished = run.finishedAt !== null;
  return (
    <div className={styles.card}>
      <div className={styles.monthHead}>
        <h2 className={styles.panelTitle}>Salary Calculation</h2>
        <span className={styles.statusPill} data-status={run.status}>
          <span className={styles.statusDot} aria-hidden="true" />
          {run.status === "completed"
            ? "Completed"
            : run.status === "failed"
              ? "Failed"
              : run.status === "queued"
                ? "Waiting to Start"
                : "In Progress"}
        </span>
      </div>
      <dl className={styles.policyFacts}>
        <div>
          <dt>Started At</dt>
          <dd>{fmtWhen(run.startedAt)}</dd>
        </div>
        <div>
          <dt>Finished At</dt>
          <dd>{finished ? fmtWhen(run.finishedAt) : "—"}</dd>
        </div>
      </dl>
    </div>
  );
}

/** The summary exactly as the BE built it — every number on the page comes
 *  from here, nothing is recomputed. */
function SummaryCard({ run }: { run: PayrollRunView }) {
  const summary = run.summary;
  if (summary === null) return null;
  if (summary.status === "no_employees") {
    return (
      <div className={styles.card}>
        <h2 className={styles.panelTitle}>Salary Calculation Summary</h2>
        <p className={styles.empty} role="status">
          No employees were included in this month's salary calculation.
          <br />
          To include an employee, make sure their joining date and salary structure have been added.
        </p>
      </div>
    );
  }
  return (
    <div className={styles.card}>
      <h2 className={styles.panelTitle}>Salary Calculation Summary</h2>
      <dl className={styles.policyFacts}>
        <div>
          <dt>Total Employees</dt>
          <dd>{summary.employees}</dd>
        </div>
        <div>
          <dt>Salary Slips Created</dt>
          <dd>{summary.payslips}</dd>
        </div>
        <div>
          <dt>Pending Amounts to Recover</dt>
          <dd>
            {fmtMoney(summary.recovery.outstandingBefore)} →{" "}
            {fmtMoney(summary.recovery.outstandingAfter)}
          </dd>
        </div>
        <div>
          <dt>New Amounts to Recover This Month</dt>
          <dd>{fmtMoney(summary.recovery.raisedThisRun)}</dd>
        </div>
        <div>
          <dt>Extra Salary Payments</dt>
          <dd>
            {summary.offCycle.applied} included in salary slips
            {summary.offCycle.staged > 0
              ? `, ${summary.offCycle.staged} waiting for the next salary calculation`
              : ""}
          </dd>
        </div>
      </dl>
      {summary.skips.length > 0 ? (
        <div className={styles.listBlock}>
          <h3 className={styles.listTitle}>Employees Not Included</h3>
          <ul className={styles.lineItems}>
            {summary.skips.map((skip) => (
              <li key={`${skip.employee}-${skip.reason}`} className={styles.lineItem}>
                <span className={styles.skipPill}>{SKIP_LABELS[skip.reason] ?? skip.reason}</span>
                <strong className={styles.itemName}>{skip.employee}</strong>
                <span className={styles.itemDetail}>{skip.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {summary.warnings.length > 0 ? (
        <div className={styles.listBlock}>
          <h3 className={styles.listTitle}>Important Messages</h3>
          <ul className={styles.lineItems}>
            {summary.warnings.map((warning) => (
              <li key={warning} className={styles.lineItem}>
                <span className={styles.itemDetail}>{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {summary.offCycle.orphaned.length > 0 ? (
        <div className={styles.listBlock}>
          <h3 className={styles.listTitle}>Extra Payments Not Included</h3>
          <ul className={styles.lineItems}>
            {summary.offCycle.orphaned.map((orphan) => (
              <li key={`${orphan.employee}-${orphan.label}`} className={styles.lineItem}>
                <strong className={styles.itemName}>{orphan.employee}</strong>
                <span className={styles.itemDetail}>
                  "{orphan.label}" – {fmtMoney(String(orphan.amount))}.
                  <br />
                  This employee's salary calculation was skipped.
                  <br />
                  Please move this extra payment to another month.
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/** The lock: offered on a completed, unlocked month (the confirm dialog
 *  quotes the BE's own sentence); already-locked months render the BE's
 *  confirmation read-only. The refusal renders inside the dialog — behind
 *  the open modal nothing else is visible — and on success the same
 *  dialog element survives the card's swap to show the BE's receipt, so
 *  its native close restores focus instead of dropping it to the body. */
function LockCard({
  month,
  status,
  run,
  lock,
  offCycleLines,
}: {
  month: string;
  status: PayrollMonthStatusView;
  run: PayrollRunView | null;
  lock: LockView | null;
  offCycleLines: OffCycleLineView[];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const fetcher = useFetcher<typeof adminPayrollAction>();
  const busy = fetcher.state !== "idle";
  const result =
    fetcher.data !== undefined && isRunResult(fetcher.data, "lock-month") ? fetcher.data : null;
  const completed = run?.status === "completed";
  const staged = offCycleLines.filter((line) => line.status === "staged");
  const saved = result !== null && result.state === "done" && lock !== null;
  const offerable = completed && !status.locked;
  if (lock === null && !offerable) return null;
  return (
    <div className={styles.card}>
      {lock !== null ? (
        <>
          <h2 className={styles.panelTitle}>Month Locked</h2>
          <p className={styles.lockedLine} role="status">
            {lock.confirmation.statement}
          </p>
          <p className={styles.hint}>{lock.confirmation.permanence}</p>
          <p className={styles.hint}>{lock.confirmation.remedy}</p>
          {lock.confirmation.stagedOffCycleLines.length > 0 ? (
            <div className={styles.listBlock}>
              <h3 className={styles.listTitle}>Extra Payments Not Included</h3>
              <ul className={styles.lineItems}>
                {lock.confirmation.stagedOffCycleLines.map((line) => (
                  <li key={`${line.employee}-${line.label}`} className={styles.lineItem}>
                    <strong className={styles.itemName}>{line.employee}</strong>
                    <span className={styles.itemDetail}>
                      {line.label} ({fmtMoney(line.amount)})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className={styles.itemDetail}>Locked At: {fmtWhen(lock.lockedAt)}</p>
        </>
      ) : (
        <>
          <h2 className={styles.panelTitle}>Lock This Month</h2>
          <p className={styles.panelLede}>
            Once you lock this month, all salary slips, deductions and attendance details become
            final.
            <br />
            You cannot unlock this month later.
          </p>
          <div className={styles.saveRow}>
            <button
              type="button"
              className={styles.saveButton}
              disabled={busy}
              onClick={() => dialogRef.current?.showModal()}
              aria-haspopup="dialog"
            >
              {busy ? <Spinner size={13} /> : null}
              {busy ? "Locking…" : "Lock This Month"}
            </button>
          </div>
        </>
      )}
      {offerable || saved ? (
        <dialog
          ref={dialogRef}
          className={dialogStyles.dialog}
          aria-labelledby={titleId}
          onClick={(event) => {
            if (event.target === dialogRef.current) dialogRef.current?.close();
          }}
        >
          {saved && lock !== null ? (
            <div className={dialogStyles.dialogForm}>
              <h3 id={titleId} className={dialogStyles.dialogTitle}>
                {fmtMonthHead(month)} Locked Successfully
              </h3>
              <p className={dialogStyles.savedMark} role="status">
                {lock.confirmation.statement}
              </p>
              <div className={dialogStyles.dialogActions}>
                <button
                  type="button"
                  className={dialogStyles.saveButton}
                  onClick={() => dialogRef.current?.close()}
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <fetcher.Form method="post" className={dialogStyles.dialogForm}>
              <input type="hidden" name="intent" value="lock-month" />
              <input type="hidden" name="month" value={month} />
              <h3 id={titleId} className={dialogStyles.dialogTitle}>
                Lock {month}?
              </h3>
              <p className={dialogStyles.dialogHint}>
                After locking this month, you cannot change salary slips, deductions or attendance
                details.
              </p>
              <p className={dialogStyles.dialogHint}>
                This action cannot be undone. You cannot unlock this month later.
              </p>
              {staged.length > 0 ? (
                <div>
                  <p className={dialogStyles.dialogHint}>
                    {staged.length === 1
                      ? "One extra payment is still waiting to be included in a salary calculation."
                      : `${staged.length} extra payments are still waiting to be included in a salary calculation.`}
                    <br />
                    {staged.length === 1
                      ? "It will not be included if you lock this month."
                      : "They will not be included if you lock this month."}
                  </p>
                  <ul className={styles.lineItems}>
                    {staged.map((line) => (
                      <li key={line.id} className={styles.lineItem}>
                        <strong className={styles.itemName}>{line.employeeName ?? "—"}</strong>
                        <span className={styles.itemDetail}>
                          {line.label} ({fmtMoney(String(line.amount))})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {result?.state === "error" ? (
                <p className={dialogStyles.dialogError} role="alert">
                  {result.message}
                </p>
              ) : null}
              <div className={dialogStyles.dialogActions}>
                <button
                  type="button"
                  className={dialogStyles.quietButton}
                  onClick={() => dialogRef.current?.close()}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.saveButton} disabled={busy}>
                  {busy ? <Spinner size={13} /> : null}
                  {busy ? "Locking…" : "Lock Permanently"}
                </button>
              </div>
            </fetcher.Form>
          )}
        </dialog>
      ) : null}
    </div>
  );
}

function isRunResult(
  data: unknown,
  kind: string,
): data is { kind: string; state: "done" } | { kind: string; state: "error"; message: string } {
  if (typeof data !== "object" || data === null) return false;
  return (data as { kind?: unknown }).kind === kind;
}

/** The company's runs across months, newest first — failed rows offer the
 *  same re-run the month card has. */
function HistoryCard({ history, chosenMonth }: { history: PayrollRunView[]; chosenMonth: string }) {
  if (history.length === 0) {
    return (
      <div className={styles.card}>
        <h2 className={styles.panelTitle}>Salary History</h2>
        <p className={styles.panelLede}>See the salary calculations that have been done earlier.</p>
        <p className={styles.empty}>
          No salary calculations have been done yet.
          <br />
          Once you calculate salary for a month, the details will appear here.
        </p>
      </div>
    );
  }
  return (
    <div className={styles.card}>
      <h2 className={styles.panelTitle}>Salary History</h2>
      <p className={styles.panelLede}>See the salary calculations that have been done earlier.</p>
      <table className={styles.historyTable}>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Status</th>
            <th scope="col">Salary Slips</th>
            <th scope="col">Started On</th>
          </tr>
        </thead>
        <tbody>
          {history.map((run) => (
            <tr key={run.id}>
              <td>
                {run.month === chosenMonth ? (
                  <strong>{run.month}</strong>
                ) : (
                  <Link
                    to={`/admin/company/payroll?tab=runs&month=${run.month}`}
                    className={styles.monthLink}
                  >
                    {run.month}
                  </Link>
                )}
              </td>
              <td>
                <span className={styles.statusPill} data-status={run.status}>
                  <span className={styles.statusDot} aria-hidden="true" />
                  {run.status === "completed"
                    ? "Completed"
                    : run.status === "failed"
                      ? "Failed"
                      : run.status === "queued"
                        ? "Waiting to Start"
                        : "In Progress"}
                </span>
              </td>
              <td>{run.summary?.payslips ?? "—"}</td>
              <td className={styles.quietCell}>{fmtWhen(run.startedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={styles.hint}>Showing the latest 50 salary calculations.</p>
    </div>
  );
}
