import { Calendar, FileText, Wallet } from "lucide-react";
import { LinkButton } from "../../../../components/ui/LinkButton";
import { fmtMoney } from "../../payrollFormat";
import type { PayslipRow } from "../../employeeProfileApi";
import type { Slice } from "../../slice";
import type { SalaryStructureLineView, SalaryStructureView } from "../../payrollViews";
import { DataTable, type TableCell } from "../Table";
import { SectionCard } from "../SectionCard";
import { fmtDay } from "../../format";
import styles from "./ProfilePayrollPanel.module.css";

/**
 * The profile's Payroll tab: the person's salary structure (read-only — the
 * editing lives on the payroll page's Structures tab, one editor per rule)
 * and their recent payslips. The layout follows the Stitch salary screen:
 * effective-dated card, one row per component, a computed monthly total, and
 * an honest payslip empty state. Editing, compensation letters and revision
 * history stay out — the profile has no API for the latter two.
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
  const total = latest === null ? null : totalMonthly(latest.lines);
  return (
    <div className={styles.stack}>
      <SectionCard
        title="Salary structure"
        subtitle="Gross salary components and allowances."
        meta={
          <span className={styles.metaGroup}>
            {latest ? (
              <span className={styles.metaPill}>
                <Calendar className={styles.metaIcon} aria-hidden="true" />
                Effective from {fmtDay(latest.effectiveFrom)}
              </span>
            ) : null}
            {latest ? (
              <LinkButton
                to={`/admin/company/payroll?tab=structures&employee=${encodeURIComponent(memberUserId)}`}
                variant="secondary"
                className={styles.manageLink}
              >
                Manage salary
              </LinkButton>
            ) : null}
          </span>
        }
      >
        {!structures.ok ? (
          <p className={styles.failed} role="alert">
            The salary structure could not load. Reload the page to try again.
          </p>
        ) : latest === null ? (
          <div className={styles.emptyBlock}>
            <span className={styles.emptyIcon} aria-hidden="true">
              <Wallet size={28} />
            </span>
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
          <>
            <dl className={styles.lines}>
              {latest.lines.map((line) => (
                <div key={line.componentId} className={styles.lineRow}>
                  <dt className={styles.lineName}>{line.componentName}</dt>
                  <dd className={styles.lineAmount}>
                    <span className={styles.amount}>{lineAmount(line)}</span>
                    {/* A line with no usable amount must not read "— per
                        month" — the unit belongs to a number. */}
                    {lineAmount(line) === "—" ? null : (
                      <span className={styles.perMonth}>per month</span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
            {total !== null ? (
              <div className={styles.totalRow}>
                <div>
                  <p className={styles.totalLabel}>Total Monthly Gross</p>
                  <p className={styles.totalNote}>
                    Excludes mandatory employer PF and gratuity contributions.
                  </p>
                </div>
                <div className={styles.totalAmountBlock}>
                  <span className={styles.totalAmount}>{fmtMoney(String(total))}</span>
                  <span className={styles.totalAnnual}>Annual: {fmtMoney(String(total * 12))}</span>
                </div>
              </div>
            ) : null}
          </>
        )}
      </SectionCard>
      <SectionCard title="Payslips" subtitle="Monthly payslips for this employee.">
        {!payslips.ok ? (
          <p className={styles.failed} role="alert">
            The payslips could not load. Reload the page to try again.
          </p>
        ) : payslips.data.length === 0 ? (
          <div className={styles.emptyBlock}>
            <span className={styles.emptyIcon} aria-hidden="true">
              <FileText size={28} />
            </span>
            <p className={styles.emptyLead}>No payslips generated yet</p>
            <p className={styles.empty}>
              Once this business runs payroll for this employee, monthly payslips will appear here.
            </p>
          </div>
        ) : (
          <DataTable
            columns={["Month", "Slip", "Paid days", "Gross", "Net"]}
            rows={payslipRows(payslips.data)}
            empty="No payslips yet."
          />
        )}
      </SectionCard>
    </div>
  );
}

function lineAmount(line: SalaryStructureLineView): string {
  if (line.amount !== null && line.amount !== undefined) return fmtMoney(line.amount);
  if (line.computedAmount !== undefined) return fmtMoney(line.computedAmount);
  return "—";
}

/** The structure's monthly gross, but only when every line has a usable
 *  amount — a partial sum would be a number the record never claimed. */
function totalMonthly(lines: SalaryStructureLineView[]): number | null {
  let total = 0;
  for (const line of lines) {
    const text = line.amount ?? line.computedAmount;
    if (text === null || text === undefined) return null;
    const value = Number(text);
    if (!Number.isFinite(value)) return null;
    total += value;
  }
  return Math.round((total + Number.EPSILON) * 100) / 100;
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
