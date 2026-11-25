import { fmtMoney } from "../../payrollFormat";
import type { OffCycleLineView } from "../../payrollRunApi";
import styles from "./OffCycleList.module.css";

/**
 * The month's off-cycle lines, read-only for now: staged rows wait for the
 * month's run (or re-target later), applied rows sit on the payslips.
 * Staging WRITES need the membership row id, which no shipped members
 * surface exposes — the add/edit/cancel dialogs land when the BE carries
 * it on a members read.
 */
export function OffCycleList({
  month,
  lines,
  locked,
}: {
  month: string;
  lines: OffCycleLineView[];
  locked: boolean;
}) {
  void month;
  void locked;
  return (
    <div className={styles.card}>
      <h2 className={styles.panelTitle}>Extra Payments</h2>
      <p className={styles.panelLede}>
        Add extra payments or amounts that employees need to repay, outside their regular salary
        structure.
        <br />
        For example: Bonus, extra wages or money to be recovered from an employee.
        <br />
        Adding new extra payments from this page will be available soon.
        <br />
        Payments already included in a salary calculation will appear below.
      </p>
      {lines.length === 0 ? (
        <p className={styles.empty}>No extra payments found for this month.</p>
      ) : (
        <table className={styles.linesTable}>
          <thead>
            <tr>
              <th scope="col">Employee</th>
              <th scope="col">Payment Details</th>
              <th scope="col">Amount</th>
              <th scope="col">Type</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id}>
                <td>{line.employeeName ?? "—"}</td>
                <td>{line.label}</td>
                <td className={styles.amountCell}>{fmtMoney(String(line.amount))}</td>
                <td>{line.tag === "wage" ? "Salary" : "Bonus"}</td>
                <td>
                  <span className={styles.statePill} data-staged={line.status === "staged"}>
                    {line.status === "staged"
                      ? "Waiting for Salary Calculation"
                      : "Included in Salary Slip"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
