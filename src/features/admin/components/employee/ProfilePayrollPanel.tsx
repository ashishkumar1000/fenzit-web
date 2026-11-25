import { LinkButton } from "../../../../components/ui/LinkButton";
import { fmtMoney } from "../../payrollFormat";
import type { PayslipRow } from "../../employeeProfileApi";
import type { Slice } from "../../slice";
import type { SalaryStructureView } from "../../payrollViews";
import { DataTable, type TableCell } from "../Table";
import { SectionCard } from "../SectionCard";
import { fmtDay } from "../../format";
import styles from "./ProfilePayrollPanel.module.css";

/**
 * The profile's Payroll tab: the person's salary structure (read-only — the
 * editing lives on the payroll page's Structures tab, one editor per rule)
 * and their recent payslips. Honest empty states: no structure yet, no
 * payslips until a run happens.
 */

export function ProfilePayrollPanel({
  memberUserId,
  structures,
  payslips,
}: {
  memberUserId: string;
  structures: Slice<SalaryStructureView[]>;
  payslips: Slice<PayslipRow[]>;
}) {
  const latest =
    structures.ok && structures.data.length > 0
      ? structures.data[structures.data.length - 1]
      : null;
  return (
    <div className={styles.stack}>
      <SectionCard
        title="Salary structure"
        meta={latest ? `Effective from ${fmtDay(latest.effectiveFrom)}` : undefined}
      >
        {!structures.ok ? (
          <p className={styles.failed} role="alert">
            The salary structure could not load — retry the page from the menu.
          </p>
        ) : latest === null ? (
          <div className={styles.emptyBlock}>
            <p className={styles.emptyLead}>No salary structure yet</p>
            <p className={styles.empty}>
              Add one to include this employee in the monthly salary runs.
            </p>
            <LinkButton
              to={`/admin/company/payroll?tab=structures&employee=${encodeURIComponent(memberUserId)}`}
              variant="primary"
            >
              Manage salary
            </LinkButton>
          </div>
        ) : (
          <dl className={styles.lines}>
            {latest.lines.map((line) => (
              <div key={line.componentId} className={styles.lineRow}>
                <dt>{line.componentName}</dt>
                <dd>
                  {line.amount !== null && line.amount !== undefined
                    ? fmtMoney(line.amount)
                    : line.computedAmount !== undefined
                      ? fmtMoney(line.computedAmount)
                      : "—"}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </SectionCard>
      <SectionCard title="Payslips" meta="Recent months">
        {!payslips.ok ? (
          <p className={styles.failed} role="alert">
            The payslips could not load — retry the page from the menu.
          </p>
        ) : (
          <DataTable
            columns={["Month", "Slip", "Paid days", "Gross", "Net"]}
            rows={payslipRows(payslips.data)}
            empty="No payslips yet — once this business runs payroll, the monthly payslips appear here."
          />
        )}
      </SectionCard>
    </div>
  );
}

function payslipRows(rows: PayslipRow[]): TableCell[][] {
  return rows.map((row) => [
    { text: row.salary_period },
    { text: row.slip_number, quiet: true },
    {
      text:
        row.payable_days > 0 ? `${row.paid_days} of ${row.payable_days}` : String(row.paid_days),
      quiet: true,
    },
    { text: fmtMoney(String(row.gross_earnings)) },
    { text: fmtMoney(String(row.net_wages)) },
  ]);
}
