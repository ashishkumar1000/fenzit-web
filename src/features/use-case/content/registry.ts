import type { UseCaseContent, UseCaseSibling } from "../components/UseCasePage";
import { AC_SERVICE_CONTENT } from "./acService";
import { APPLIANCE_REPAIR_CONTENT } from "./applianceRepair";
import { CCTV_CONTENT } from "./cctv";
import { CLEANING_CONTENT } from "./cleaning";
import { COLLECTION_CONTENT } from "./collection";
import { DELIVERY_CONTENT } from "./delivery";
import { ELECTRICIAN_CONTENT } from "./electrician";
import { EMPLOYEE_ATTENDANCE_CONTENT } from "./employeeAttendance";
import { FACILITY_MANAGEMENT_CONTENT } from "./facilityManagement";
import { FIELD_TRACKING_CONTENT } from "./fieldTracking";
import { GEOFENCING_CONTENT } from "./geofencing";
import { IT_AMC_CONTENT } from "./itAmc";
import { LEAVE_MANAGEMENT_CONTENT } from "./leaveManagement";
import { PEST_CONTROL_CONTENT } from "./pestControl";
import { PLUMBER_CONTENT } from "./plumber";
import { SALON_AT_HOME_CONTENT } from "./salonAtHome";
import { SERVICE_BUSINESS_CONTENT } from "./serviceBusiness";
import { SOLAR_CONTENT } from "./solar";
import { TECHNICIAN_TRACKING_CONTENT } from "./technicianTracking";
import { WATER_PURIFIER_CONTENT } from "./waterPurifier";

/**
 * Every use-case page in one list: the routes are drawn from it, and each page's sibling links
 * come from rotating it. Adding a page to the site means adding its content file's entry here
 * (plus its meta and a speculationrules entry), and it joins the sibling rotation shown on the
 * other pages.
 */
export const ALL_USE_CASE_CONTENT: readonly UseCaseContent[] = [
  EMPLOYEE_ATTENDANCE_CONTENT,
  GEOFENCING_CONTENT,
  LEAVE_MANAGEMENT_CONTENT,
  FIELD_TRACKING_CONTENT,
  TECHNICIAN_TRACKING_CONTENT,
  SERVICE_BUSINESS_CONTENT,
  AC_SERVICE_CONTENT,
  APPLIANCE_REPAIR_CONTENT,
  CCTV_CONTENT,
  CLEANING_CONTENT,
  COLLECTION_CONTENT,
  DELIVERY_CONTENT,
  ELECTRICIAN_CONTENT,
  FACILITY_MANAGEMENT_CONTENT,
  IT_AMC_CONTENT,
  PEST_CONTROL_CONTENT,
  PLUMBER_CONTENT,
  SALON_AT_HOME_CONTENT,
  SOLAR_CONTENT,
  WATER_PURIFIER_CONTENT,
];

/** The other use-case pages, rotated so each page leads with a different set, four at a time. */
export function siblingsFor(path: string): UseCaseSibling[] {
  const selfIndex = ALL_USE_CASE_CONTENT.findIndex((page) => page.meta.path === path);
  const rotated =
    selfIndex < 0
      ? ALL_USE_CASE_CONTENT
      : [
          ...ALL_USE_CASE_CONTENT.slice(selfIndex + 1),
          ...ALL_USE_CASE_CONTENT.slice(0, selfIndex + 1),
        ];
  return rotated
    .filter((page) => page.meta.path !== path)
    .slice(0, 4)
    .map((page) => ({ to: page.meta.path, label: page.shortLabel }));
}
