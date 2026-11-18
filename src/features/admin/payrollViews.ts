/**
 * The payroll config surfaces' response types, exactly as the backend's
 * services map their DB rows onto the wire (camelCase throughout; money is
 * 2dp text like "20000.00"). One source for the API clients, the loaders and
 * the panels — nothing here invents a field the BE does not send.
 */

/** One library component (23-3). `isBasic` marks THE basic component the
 *  structures must include; `active: false` hides it from new structure
 *  lines while keeping the name on old revisions. */
export interface SalaryComponentView {
  id: string;
  name: string;
  isBasic: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/** A formula AST node exactly as src/payroll/formula.ts validates it. The
 *  console's builder only emits `percent-of` (optionally wrapped in a `+`/`-`
 *  `binary` with a const), but revisions saved elsewhere may carry any node. */
export type FormulaNode =
  | { kind: "component"; componentId: string }
  | { kind: "const"; value: number }
  | { kind: "percent-of"; percent: number; of: FormulaNode }
  | { kind: "binary"; op: "+" | "-" | "*" | "/"; left: FormulaNode; right: FormulaNode };

/** One structure line as the read resolves it: the component's current name
 *  and — for amount lines — the stored amount, for formula lines the AST,
 *  and `computedAmount` when the structure still evaluates. */
export interface SalaryStructureLineView {
  componentId: string;
  componentName: string;
  amount?: string | null;
  formula?: FormulaNode | null;
  computedAmount?: string;
}

/** One effective-dated revision of an employee's salary structure, oldest
 *  first in the GET's answer. */
export interface SalaryStructureView {
  effectiveFrom: string;
  lines: SalaryStructureLineView[];
  createdAt: string;
  updatedAt: string;
}

/** One effective-dated payroll calendar row (23-4). An empty list means the
 *  defaults govern: fixed-26 divisor, cutoff 25, pay date 1. */
export interface PayrollCalendarView {
  effectiveFrom: string;
  divisorConvention: "calendar" | "fixed-30" | "fixed-26";
  cutoffDay: number;
  payDate: number;
  createdAt: string;
  updatedAt: string;
}

/** What one payroll month looks like: the resolved policy, what governs it
 *  (a dated row or the defaults), the first payable month's bound and, when
 *  the month cannot run yet, the plain-English reason. */
export interface PayrollMonthStatusView {
  month: string;
  divisorConvention: PayrollCalendarView["divisorConvention"];
  cutoffDay: number;
  payDate: number;
  /** The governing row's effectiveFrom, or null when defaults govern. */
  effectiveFrom: string | null;
  locked: boolean;
  firstPayrollMonth: string | null;
  notRunnableReason: string | null;
}

/** The state's rules-notified flag; `updatedAt` is the epoch sentinel while
 *  no row has been saved yet. */
export interface PayrollStateRulesView {
  notified: boolean;
  updatedAt: string;
}

/** One effective-dated deduction head (23-5). `basis` exists on percent
 *  heads only; flat heads carry null. */
export interface DeductionHeadView {
  id: string;
  name: string;
  kind: "flat" | "percent";
  amount: string;
  basis: "basic" | "gross" | null;
  effectiveFrom: string;
  active: boolean;
  updatedAt: string;
}

/** One effective-dated PF-covered switch row. An empty list means PF is off,
 *  except for ever-members (UAN or PF account number on the membership). */
export interface PayrollPfConfigView {
  effectiveFrom: string;
  covered: boolean;
  updatedAt: string;
}

/** One employee's PF exclusion state; `updatedAt` is the epoch sentinel
 *  while no row has been saved for them. */
export interface PayrollPfExclusionView {
  excluded: boolean;
  updatedAt: string;
}

/** The FY 2026-27 TDS constants, read-only — statute, not config. */
export interface TdsConfigView {
  taxYear: string;
  regime: string;
  standardDeduction: string;
  slabs: Array<{ upto: number | null; ratePercent: number }>;
  rebate: {
    section: string;
    threshold: number;
    residentOnly: boolean;
    description: string;
  };
  cessRatePercent: number;
}

/** One member's employment data (23-1) — served to the company admin only,
 *  never on lists. Every field except userId/employeeCode is null until set. */
export interface EmploymentView {
  userId: string;
  employeeCode: string;
  joinDate: string | null;
  exitDate: string | null;
  pan: string | null;
  dateOfBirth: string | null;
  fatherName: string | null;
  motherName: string | null;
  spouseName: string | null;
  pfAccountNumber: string | null;
  uanNumber: string | null;
  designation: string | null;
  department: string | null;
  bankAccountNumber: string | null;
  ifscCode: string | null;
  bankName: string | null;
}
