/**
 * The employee profile page's copy, in one place — the sections' labels, the
 * master-record fields in their fixed order, and the empty-state captions.
 * Every user-facing string of the profile renders from here.
 */

/** The tab strip, in the design's order. The first tab is the bare address. */
export const EMPLOYEE_PROFILE_TABS = [
  { value: "master", label: "Personal Details" },
  { value: "jobs", label: "Jobs" },
  { value: "attendance", label: "Attendance" },
  { value: "leave", label: "Leave" },
  { value: "payroll", label: "Salary" },
] as const;

/** The master-record fields in their fixed display order. `statutory` marks
 *  the fields the EPF filing needs — the setup banner counts them. */
export const MASTER_RECORD_FIELDS: Array<{
  key: string;
  label: string;
  statutory?: boolean;
}> = [
  { key: "dateOfBirth", label: "Date of Birth", statutory: true },
  { key: "fatherName", label: "Father's Name" },
  { key: "motherName", label: "Mother's Name" },
  { key: "spouseName", label: "Spouse Name" },
  { key: "pan", label: "PAN Number", statutory: true },
  { key: "pfAccountNumber", label: "PF Account Number", statutory: true },
  { key: "uanNumber", label: "UAN Number", statutory: true },
  { key: "bankName", label: "Bank Name", statutory: true },
  { key: "ifscCode", label: "IFSC Code", statutory: true },
  { key: "bankAccountNumber", label: "Bank Account Number", statutory: true },
  { key: "department", label: "Department" },
];

/** The leave balance card's accrual caption, from the balance row itself. */
export function accrualCaption(mode: string, days: number): string {
  if (mode === "monthly") {
    return days === 1 ? "1 day added every month." : `${days} days added every month.`;
  }
  if (mode === "annual") return `${days} days given every year.`;
  return "Leave added by the owner.";
}
