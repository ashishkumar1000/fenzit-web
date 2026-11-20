import { Link, useNavigate } from "react-router";
import type { AttendanceFilters } from "../adminBrowseLoaders";
import { ATTENDANCE_NO_OFFICE, attendanceUrl } from "../attendanceUrl";
import { ATTENDANCE_SORT_WORDS } from "../attendanceLabels";
import { ConsoleFilterDropdown, type DropdownOption } from "./ConsoleFilterDropdown";
import styles from "./AttendanceFilterBar.module.css";

/** Clears every filter — shown only when something is set, and always back
 *  to page 1. */
export function ClearAllButton({ filters }: { filters: AttendanceFilters }) {
  const navigate = useNavigate();
  const dirty = filters.chip !== "" || filters.office !== "" || filters.sort !== "absent";
  if (!dirty) return null;
  return (
    <button
      type="button"
      className={styles.clearAll}
      onClick={() => navigate(attendanceUrl(filters, { chip: "", office: "", sort: "absent" }))}
    >
      Clear all
    </button>
  );
}

/** The tally chips: All, Present, Late, Absent. The counts are the whole
 *  roster's (they do not move as other filters change) — the same contract
 *  as the jobs and customers chips. */
export function AttendanceChips({
  filters,
  counts,
}: {
  filters: AttendanceFilters;
  counts: { all: number; present: number; late: number; absent: number };
}) {
  const chips: Array<{ value: AttendanceFilters["chip"]; label: string; count: number }> = [
    { value: "", label: "All", count: counts.all },
    { value: "present", label: "Present", count: counts.present },
    { value: "late", label: "Late", count: counts.late },
    { value: "absent", label: "Absent", count: counts.absent },
  ];
  return (
    <div className={styles.chips} role="group" aria-label="Filter employees by attendance">
      {chips.map((chip) => (
        <Link
          key={chip.value}
          to={attendanceUrl(filters, { chip: chip.value })}
          className={filters.chip === chip.value ? styles.chipActive : styles.chip}
          aria-current={filters.chip === chip.value ? "true" : undefined}
        >
          {chip.label}
          <span className={styles.chipCount}>{chip.count}</span>
        </Link>
      ))}
    </div>
  );
}

/** One console filter dropdown over the month table's URL state. */
function FilterDropdown({
  label,
  field,
  value,
  valueLabel,
  options,
  filters,
}: {
  label: string;
  field: "office" | "sort";
  value: string;
  valueLabel: string;
  options: DropdownOption[];
  filters: AttendanceFilters;
}) {
  const navigate = useNavigate();
  return (
    <ConsoleFilterDropdown
      label={label}
      valueLabel={valueLabel}
      value={value}
      defaultValue={field === "sort" ? "absent" : ""}
      showSearch={false}
      options={options}
      apply={(next) => navigate(attendanceUrl(filters, { [field]: next }))}
    />
  );
}

/** The office dropdown, built from the roster's distinct offices, with a
 *  "No office" row for employees outside every office (the sentinel value
 *  leaves an office literally named "none" filterable by name). A name that
 *  outlives its office (a rename) still filters by the stored name — the
 *  trigger says so honestly instead of claiming "All". */
export function OfficeDropdown({
  filters,
  offices,
}: {
  filters: AttendanceFilters;
  offices: string[];
}) {
  const known = filters.office === ATTENDANCE_NO_OFFICE || offices.includes(filters.office);
  return (
    <FilterDropdown
      label="Office"
      field="office"
      value={filters.office}
      valueLabel={
        filters.office === ""
          ? "All offices"
          : known
            ? (offices.find((o) => o === filters.office) ?? "No office")
            : "Chosen office"
      }
      options={[
        { value: "", text: "All offices" },
        ...offices.map((office) => ({ value: office, text: office })),
        { value: ATTENDANCE_NO_OFFICE, text: "No office" },
      ]}
      filters={filters}
    />
  );
}

/** The sort dropdown: Most absent (the mockup's default) / Name A–Z. */
export function SortDropdown({ filters }: { filters: AttendanceFilters }) {
  return (
    <FilterDropdown
      label="Sort"
      field="sort"
      value={filters.sort}
      valueLabel={ATTENDANCE_SORT_WORDS[filters.sort]}
      options={Object.entries(ATTENDANCE_SORT_WORDS).map(([value, text]) => ({ value, text }))}
      filters={filters}
    />
  );
}
