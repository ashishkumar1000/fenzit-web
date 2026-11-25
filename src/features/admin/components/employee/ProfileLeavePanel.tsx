import type { LeaveRow, Page } from "../../companyApi";
import type { LeaveBalance } from "../../employeeProfileApi";
import type { Slice } from "../../slice";
import { DataTable, type TableCell } from "../Table";
import { SectionCard } from "../SectionCard";
import { accrualCaption } from "../../employeeProfileLabels";
import { fmtDay } from "../../format";
import styles from "./ProfileLeavePanel.module.css";

/**
 * The profile's Leave tab: one balance card per accrual-bearing leave type
 * (the numbers the day-status engine uses — Comp-Off is not an accrual type
 * and the endpoint rightly leaves it out), then the employee's newest
 * requests — the read is one page, so an older tail says so instead of
 * standing in for the whole history.
 */

export function ProfileLeavePanel({
  balances,
  requests,
}: {
  balances: Slice<LeaveBalance[]>;
  requests: Slice<Page<LeaveRow>>;
}) {
  return (
    <div className={styles.stack}>
      <div className={styles.balanceRow}>
        {!balances.ok ? (
          <p className={styles.failed} role="alert">
            We could not load the employee's leave balance. Please try again.
          </p>
        ) : balances.data.length === 0 ? (
          <p className={styles.empty}>No leave types have been set up for your company yet.</p>
        ) : (
          balances.data.map((balance) => (
            <div key={balance.typeId} className={styles.balanceCard}>
              <p className={styles.balanceName}>{balance.name}</p>
              <p className={styles.balanceValue}>
                {balance.remaining}
                <span className={styles.balanceUnit}> Days Available</span>
              </p>
              <p className={styles.balanceCaption}>
                {accrualCaption(balance.accrualMode, balance.accrualDays)}
                {balance.enabled ? "" : " · This leave type is currently turned off."}
              </p>
            </div>
          ))
        )}
      </div>
      <SectionCard
        title="Leave requests"
        meta="Newest requests first."
        footer={
          requests.ok && requests.data.hasMore ? (
            // The read is one page and the console has no older-pages view
            // yet — say so rather than let the first page read as the whole
            // history.
            <p className={styles.empty}>
              {`Showing only the latest ${requests.data.data.length} ${
                requests.data.data.length === 1 ? "leave request" : "leave requests"
              }. Older requests are not available here yet.`}
            </p>
          ) : undefined
        }
      >
        {!requests.ok ? (
          <p className={styles.failed} role="alert">
            We could not load the employee's leave requests. Please try again.
          </p>
        ) : (
          <DataTable
            columns={["Leave Dates", "Leave Duration", "Working Days", "Reason", "Status"]}
            rows={requestRows(requests.data.data)}
            empty="No leave requests yet. Employee leave requests will appear here with their dates, leave type and approval status."
          />
        )}
      </SectionCard>
    </div>
  );
}

function requestRows(rows: LeaveRow[]): TableCell[][] {
  return rows.map((row) => [
    { text: `${fmtDay(row.startDate)} to ${fmtDay(row.endDate)}` },
    { text: row.part === "" ? "Full Day" : humanizePart(row.part) },
    { text: String(row.workingDays) },
    { text: row.reason === "" ? "—" : row.reason },
    { text: row.status, status: true },
  ]);
}

function humanizePart(part: string): string {
  return part
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
