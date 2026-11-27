/**
 * Generated from the backend's UpdateEmploymentDto OpenAPI schema.
 * Do not edit by hand: update the BE DTO, run `bun run contract:employment`
 * in fenzit-be, copy `contracts/employment.schema.json` here, then run
 * `bun run sync:employment-contract`.
 */

export const EMPLOYMENT_FIELDS = [
  "employeeCode",
  "joinDate",
  "exitDate",
  "pan",
  "dateOfBirth",
  "fatherName",
  "motherName",
  "spouseName",
  "pfAccountNumber",
  "uanNumber",
  "designation",
  "department",
  "bankAccountNumber",
  "ifscCode",
  "bankName",
] as const;

export type EmploymentField = (typeof EMPLOYMENT_FIELDS)[number];

export interface EmploymentFieldRules {
  readonly maxLength?: number;
  readonly pattern?: string;
  readonly format?: string;
}

export const EMPLOYMENT_FIELD_RULES: Record<EmploymentField, EmploymentFieldRules> = {
  employeeCode: { maxLength: 50 },
  joinDate: { format: "date" },
  exitDate: { format: "date" },
  pan: { maxLength: 10, pattern: "^[A-Z]{5}[0-9]{4}[A-Z]$" },
  dateOfBirth: { format: "date" },
  fatherName: { maxLength: 100 },
  motherName: { maxLength: 100 },
  spouseName: { maxLength: 100 },
  pfAccountNumber: { maxLength: 50 },
  uanNumber: { maxLength: 20 },
  designation: { maxLength: 100 },
  department: { maxLength: 100 },
  bankAccountNumber: { maxLength: 35 },
  ifscCode: { maxLength: 11, pattern: "^[A-Z]{4}[A-Z0-9]{7}$" },
  bankName: { maxLength: 100 },
};
