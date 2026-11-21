import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import type { EmployeesFilters } from "../adminBrowseLoaders";
import { employeesUrl } from "../employeesUrl";
import { SearchIcon } from "../../../components/ui/consoleIcons";
import { useCmdKFocus } from "../../../hooks/useCmdKFocus";
import { ConsoleFilterDropdown, type DropdownOption } from "./ConsoleFilterDropdown";
import styles from "./EmployeesFilterBar.module.css";

/** Clears every filter and the search text — shown only when something is
 *  set, and always back to page 1. */
export function ClearAllButton({ filters }: { filters: EmployeesFilters }) {
  const navigate = useNavigate();
  const dirty =
    filters.q !== "" ||
    filters.status !== "all" ||
    filters.role !== "all" ||
    filters.jobSetting !== "all" ||
    filters.sort !== "joined_new";
  if (!dirty) return null;
  return (
    <button
      type="button"
      className={styles.clearAll}
      onClick={() =>
        navigate(
          employeesUrl(filters, {
            q: "",
            status: "all",
            role: "all",
            jobSetting: "all",
            sort: "joined_new",
          }),
        )
      }
    >
      Clear all
    </button>
  );
}

/** The search field in the filter strip: submitting navigates to the new
 *  address, so the other filters ride along and an empty search drops out of
 *  the URL. ⌘K focuses it. */
export function SearchBox({ filters }: { filters: EmployeesFilters }) {
  const inputRef = useRef<HTMLInputElement>(null);
  useCmdKFocus(inputRef);
  const navigate = useNavigate();
  const [query, setQuery] = useState(filters.q);
  // The URL can change the search without this box (Clear all, back or
  // forward). Resync during render, the React pattern for a prop change, so
  // the field never shows a term the table is not filtered by.
  const [seenQ, setSeenQ] = useState(filters.q);
  if (filters.q !== seenQ) {
    setSeenQ(filters.q);
    setQuery(filters.q);
  }
  return (
    <form
      className={styles.topSearch}
      onSubmit={(event) => {
        event.preventDefault();
        navigate(employeesUrl(filters, { q: query.trim() }));
      }}
    >
      <SearchIcon size={16} className={styles.searchIcon} />
      <input
        ref={inputRef}
        name="q"
        type="search"
        className={styles.searchInput}
        placeholder="Search name, code or phone…"
        aria-label="Search employees"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        maxLength={80}
      />
      <kbd className={styles.searchKbd} aria-hidden="true">
        ⌘K
      </kbd>
    </form>
  );
}

const STATUS_CHIPS: Array<{ value: EmployeesFilters["status"]; label: string }> = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "invited", label: "Invited" },
  { value: "deactivated", label: "Deactivated" },
];

/** The status chip row: links, so a chip change is a navigation and the
 *  loader refetches. Counts are whole-company, so they do not move as other
 *  filters change. */
export function StatusChips({
  filters,
  counts,
}: {
  filters: EmployeesFilters;
  counts: { total: number; active: number; invited: number; deactivated: number };
}) {
  const chipValue: Record<string, number> = {
    all: counts.total,
    active: counts.active,
    invited: counts.invited,
    deactivated: counts.deactivated,
  };
  return (
    <div className={styles.chips} role="group" aria-label="Filter by status">
      {STATUS_CHIPS.map((chip) => (
        <Link
          key={chip.value}
          to={employeesUrl(filters, { status: chip.value })}
          className={filters.status === chip.value ? styles.chipActive : styles.chip}
          aria-current={filters.status === chip.value ? "true" : undefined}
        >
          {chip.label}
          <span className={styles.chipCount}>{chipValue[chip.value]}</span>
        </Link>
      ))}
    </div>
  );
}

/** One console filter dropdown: pill trigger, option panel with search,
 *  Reset and Apply. Applying navigates to the new address, so the loader
 *  refetches. */
export function FilterDropdown({
  label,
  field,
  value,
  valueLabel,
  defaultValue,
  options,
  searchPlaceholder,
  showSearch,
  filters,
}: {
  label: string;
  field: "role" | "jobSetting" | "sort";
  value: string;
  valueLabel: string;
  defaultValue: string;
  options: DropdownOption[];
  searchPlaceholder?: string;
  showSearch?: boolean;
  filters: EmployeesFilters;
}) {
  const navigate = useNavigate();
  return (
    <ConsoleFilterDropdown
      label={label}
      valueLabel={valueLabel}
      value={value}
      defaultValue={defaultValue}
      options={options}
      searchPlaceholder={searchPlaceholder}
      showSearch={showSearch}
      apply={(next) => navigate(employeesUrl(filters, { [field]: next }))}
    />
  );
}
