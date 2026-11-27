/**
 * The employment record's four sections — the order of the dialog's rail and
 * the fields each one holds. Plain data, no React: the form renders it, the
 * profile's master-record links use it to open the section a field lives in,
 * and the resource path keeps the dialog and its hosts on one address.
 *
 * The field list itself is generated from the BE's DTO
 * (`employmentContract.generated.ts`); this file only decides presentation.
 */

import {
  EMPLOYMENT_FIELD_RULES,
  EMPLOYMENT_FIELDS,
  type EmploymentField,
} from "./employmentContract.generated";
import type { EmploymentView } from "./payrollViews";

export { EMPLOYMENT_FIELD_RULES, EMPLOYMENT_FIELDS, type EmploymentField };

export const EMPLOYMENT_SECTIONS = ["job", "personal", "statutory", "bank"] as const;

export type EmploymentSection = (typeof EMPLOYMENT_SECTIONS)[number];

export const DEFAULT_EMPLOYMENT_SECTION: EmploymentSection = "job";

export const SECTION_LABELS: Record<EmploymentSection, string> = {
  job: "Job",
  personal: "Personal",
  statutory: "Statutory IDs",
  bank: "Bank",
};

/** Every editable field, in the sections' order. The save's tri-state diff
 *  walks this list; the BE's action accepts the same fifteen keys. */
/* Compile-time contract with the API view: the rail must list exactly the
   editable fields the BE returns. Add a field to `EmploymentView` and this
   line fails the build until the field has a section. */
type ViewField = Exclude<keyof EmploymentView, "userId">;
type Assert<T extends true> = T;
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
export type EmploymentFieldsMatchView = Assert<Same<EmploymentField, ViewField>>;

export const SECTION_FIELDS: Record<EmploymentSection, readonly EmploymentField[]> = {
  job: ["employeeCode", "joinDate", "exitDate", "designation", "department"],
  personal: ["dateOfBirth", "fatherName", "motherName", "spouseName"],
  statutory: ["pan", "uanNumber", "pfAccountNumber"],
  bank: ["bankAccountNumber", "ifscCode", "bankName"],
};

/** Which section a master-record row's Add link opens. The banner opens the
 *  section of its first missing field, so the owner lands where the gap is. */
const MASTER_FIELD_SECTIONS: Record<string, EmploymentSection> = {
  dateOfBirth: "personal",
  fatherName: "personal",
  motherName: "personal",
  spouseName: "personal",
  pan: "statutory",
  pfAccountNumber: "statutory",
  uanNumber: "statutory",
  bankName: "bank",
  ifscCode: "bank",
  bankAccountNumber: "bank",
  department: "job",
};

export function sectionForMasterField(key: string | undefined): EmploymentSection {
  return key === undefined ? DEFAULT_EMPLOYMENT_SECTION : (MASTER_FIELD_SECTIONS[key] ?? "job");
}
