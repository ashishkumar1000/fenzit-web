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
 * and the endpoint rightly leaves it out), then the employee's requests.
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
            The leave balances could not load — retry the page from the menu.
          </p>
        ) : balances.data.length === 0 ? (
          <p className={styles.empty}>No accrual leave types are set up for this company yet.</p>
        ) : (
          balances.data.map((balance) => (
            <div key={balance.typeId} className={styles.balanceCard}>
              <p className={styles.balanceName}>{balance.name}</p>
              <p className={styles.balanceValue}>
                {balance.remaining}
                <span className={styles.balanceUnit}> days left</span>
              </p>
              <p className={styles.balanceCaption}>
                {accrualCaption(balance.accrualMode, balance.accrualDays)}
                {balance.enabled ? "" : " · Type disabled"}
              </p>
            </div>
          ))
        )}
      </div>
      <SectionCard title="Leave requests" meta="Newest first">
        {!requests.ok ? (
          <p className={styles.failed} role="alert">
            The leave requests could not load — retry the page from the menu.
          </p>
        ) : (
          <DataTable
            columns={["Dates", "Part", "Working days", "Reason", "Status"]}
            rows={requestRows(requests.data.data)}
            empty="No leave requests yet — requests appear here with type, dates and approval status."
          />
        )}
      </SectionCard>
    </div>
  );
}

function requestRows(rows: LeaveRow[]): TableCell[][] {
  return rows.map((row) => [
    { text: `${fmtDay(row.startDate)} – ${fmtDay(row.endDate)}` },
    { text: row.part === "" ? "Full day" : humanizePart(row.part) },
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
