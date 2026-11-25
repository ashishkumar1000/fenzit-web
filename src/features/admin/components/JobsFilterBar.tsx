import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import type { JobsFilters } from "../adminBrowseLoaders";
import { jobsUrl } from "../jobsUrl";
import type { JobsStats } from "../companyApi";
import { SearchIcon } from "../../../components/ui/consoleIcons";
import { useCmdKFocus } from "../../../hooks/useCmdKFocus";
import { ConsoleFilterDropdown, type DropdownOption } from "./ConsoleFilterDropdown";
import { JOB_PRIORITY_WORDS, JOB_SORT_WORDS, JOB_STATUS_WORDS } from "../jobsLabels";
import styles from "./JobsFilterBar.module.css";

/** Clears every filter and the search text — shown only when something is
 *  set, and always back to page 1. */
export function ClearAllButton({ filters }: { filters: JobsFilters }) {
  const navigate = useNavigate();
  const dirty =
    filters.q !== "" ||
    filters.status !== "" ||
    filters.skill !== "" ||
    filters.priority !== "" ||
    filters.sort !== "latest";
  if (!dirty) return null;
  return (
    <button
      type="button"
      className={styles.clearAll}
      onClick={() =>
        navigate(
          jobsUrl(filters, {
            q: "",
            status: "",
            skill: "",
            priority: "",
            sort: "latest",
          }),
        )
      }
    >
      Clear All Filters
    </button>
  );
}

/** The search field in the filter strip: submitting navigates to the new
 *  address, so the other filters ride along and an empty search drops out of
 *  the URL. ⌘K focuses it. */
export function SearchBox({ filters }: { filters: JobsFilters }) {
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
        navigate(jobsUrl(filters, { q: query.trim() }));
      }}
    >
      <SearchIcon size={16} className={styles.searchIcon} />
      <input
        ref={inputRef}
        name="q"
        type="search"
        className={styles.searchInput}
        placeholder="Search by job, customer, employee, work type or location…"
        aria-label="Search jobs"
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

/** The status chips, in the order a job's life runs. The counts are
 *  whole-company (the stats the tiles use), so they do not move as other
 *  filters change — the same contract as the customers buckets. */
export function StatusChips({ filters, stats }: { filters: JobsFilters; stats: JobsStats }) {
  const chips: Array<{ value: JobsFilters["status"]; label: string; count: number }> = [
    { value: "", label: JOB_STATUS_WORDS[""], count: stats.total },
    { value: "scheduled", label: JOB_STATUS_WORDS["scheduled"], count: stats.scheduled },
    {
      value: "in_progress",
      label: JOB_STATUS_WORDS["in_progress"],
      count: stats.inProgress,
    },
    {
      value: "pending_approval",
      label: JOB_STATUS_WORDS["pending_approval"],
      count: stats.pendingApproval,
    },
    { value: "completed", label: JOB_STATUS_WORDS["completed"], count: stats.completed },
    { value: "cancelled", label: JOB_STATUS_WORDS["cancelled"], count: stats.cancelled },
    { value: "rejected", label: JOB_STATUS_WORDS["rejected"], count: stats.rejected },
  ];
  return (
    <div className={styles.chips} role="group" aria-label="Filter jobs by status">
      {chips.map((chip) => (
        <Link
          key={chip.value}
          to={jobsUrl(filters, { status: chip.value })}
          className={filters.status === chip.value ? styles.chipActive : styles.chip}
          aria-current={filters.status === chip.value ? "true" : undefined}
        >
          {chip.label}
          <span className={styles.chipCount}>{chip.count}</span>
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
  field: "skill" | "priority" | "sort";
  value: string;
  valueLabel: string;
  defaultValue: string;
  options: DropdownOption[];
  searchPlaceholder?: string;
  showSearch?: boolean;
  filters: JobsFilters;
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
      apply={(next) => navigate(jobsUrl(filters, { [field]: next }))}
    />
  );
}

/** The skill dropdown's option list, built from the catalog the loader
 *  settled — a catalog failure degrades to one disabled note, never a
 *  broken dropdown. */
export function SkillDropdown({
  filters,
  skills,
}: {
  filters: JobsFilters;
  skills: Array<{ id: string; name: string }>;
}) {
  const active = skills.find((s) => s.id === filters.skill);
  // A skill id the catalog doesn't list (a failed catalog fetch on reload, a
  // hand-typed address) still filters the table — the trigger must not claim
  // "All" while the rows are filtered by a skill it can't name.
  return (
    <FilterDropdown
      label="Work Type"
      field="skill"
      value={filters.skill}
      valueLabel={
        active !== undefined ? active.name : filters.skill !== "" ? "Selected Work Type" : "All"
      }
      defaultValue=""
      searchPlaceholder="Search work types…"
      options={skills.map((s) => ({ value: s.id, text: s.name }))}
      filters={filters}
    />
  );
}

/** The priority dropdown: All / Normal / Urgent. */
export function PriorityDropdown({ filters }: { filters: JobsFilters }) {
  const options = ["normal", "urgent"].map((value) => ({
    value,
    text: JOB_PRIORITY_WORDS[value] ?? value,
  }));
  return (
    <FilterDropdown
      label="Priority"
      field="priority"
      value={filters.priority}
      valueLabel={JOB_PRIORITY_WORDS[filters.priority] ?? "All"}
      defaultValue=""
      showSearch={false}
      options={options}
      filters={filters}
    />
  );
}

/** The sort dropdown: Latest (newest created) / Soonest (earliest scheduled). */
export function SortDropdown({ filters }: { filters: JobsFilters }) {
  const options = (["latest", "soonest"] as const).map((value) => ({
    value,
    text: JOB_SORT_WORDS[value],
  }));
  return (
    <FilterDropdown
      label="Sort"
      field="sort"
      value={filters.sort}
      valueLabel={JOB_SORT_WORDS[filters.sort]}
      defaultValue="latest"
      showSearch={false}
      options={options}
      filters={filters}
    />
  );
}
