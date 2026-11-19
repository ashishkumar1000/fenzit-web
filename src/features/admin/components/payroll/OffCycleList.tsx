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
      <h2 className={styles.panelTitle}>Off-cycle lines</h2>
      <p className={styles.panelLede}>
        One-off earnings and recoveries outside the salary structure. Staging new lines from the
        console is coming — lines a run has already paid show below.
      </p>
      {lines.length === 0 ? (
        <p className={styles.empty}>No off-cycle lines for this month.</p>
      ) : (
        <table className={styles.linesTable}>
          <thead>
            <tr>
              <th scope="col">Employee</th>
              <th scope="col">Label</th>
              <th scope="col">Amount</th>
              <th scope="col">Kind</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id}>
                <td>{line.employeeName ?? "—"}</td>
                <td>{line.label}</td>
                <td className={styles.amountCell}>{fmtMoney(String(line.amount))}</td>
                <td>{line.tag === "wage" ? "Wage" : "Bonus"}</td>
                <td>
                  <span className={styles.statePill} data-staged={line.status === "staged"}>
                    {line.status === "staged" ? "Waiting for the run" : "On the payslips"}
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
