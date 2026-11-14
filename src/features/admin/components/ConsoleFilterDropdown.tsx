import { useState } from "react";
import type { ComponentType } from "react";
import { SearchIcon, type ConsoleIconProps } from "../../../components/ui/consoleIcons";
import styles from "./ConsoleFilterDropdown.module.css";

export interface DropdownOption {
  value: string;
  /** The optional chip at the row's left, e.g. the "Off" mark. */
  chip?: {
    label: string;
    tone: "gray" | "sky" | "violet" | "green";
    Icon?: ComponentType<ConsoleIconProps>;
  };
  /** The row's text after the chip; omitted when the chip says it all. */
  text?: string;
  /** The whole-company count on the row's right. */
  count?: number;
}

/**
 * The console's filter dropdown: a pill trigger with the chosen value and its
 * count, opening a panel with a search box, the option rows (checkbox, chip,
 * count) and the Reset / Apply footer. One selection at a time — the page's
 * address carries one value per filter, so a second check replaces the first.
 * A transparent backdrop closes the panel on an outside click, and Escape
 * closes it from the keyboard; no effect is needed for either.
 */
export function ConsoleFilterDropdown({
  label,
  valueLabel,
  value,
  defaultValue,
  options,
  searchPlaceholder,
  apply,
  showSearch = true,
}: {
  label: string;
  /** The chosen value's word in the trigger, e.g. "All". */
  valueLabel: string;
  value: string;
  /** The reset target, e.g. "all". */
  defaultValue: string;
  options: DropdownOption[];
  searchPlaceholder?: string;
  /** Commits the pending value and closes the panel. */
  apply: (value: string) => void;
  /** The search row; a tiny option set doesn't need one. */
  showSearch?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(value);
  const [search, setSearch] = useState("");
  const selected = options.find((option) => option.value === value);
  const count = selected?.count;
  const visible = options.filter((option) => {
    const words = `${option.chip?.label ?? ""} ${option.text ?? ""}`.toLowerCase();
    return words.includes(search.trim().toLowerCase());
  });

  function openPanel(): void {
    setPending(value);
    setSearch("");
    setOpen(true);
  }

  function onKeyDown(event: React.KeyboardEvent): void {
    if (event.key === "Escape") setOpen(false);
  }

  return (
    <span className={styles.wrap} onKeyDown={onKeyDown}>
      <button
        type="button"
        className={open ? styles.triggerOpen : styles.trigger}
        onClick={() => (open ? setOpen(false) : openPanel())}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={styles.triggerLabel}>{label}:</span>
        <span className={styles.triggerValue}>{valueLabel}</span>
        {count !== undefined ? <span className={styles.triggerCount}>{count}</span> : null}
        <span className={open ? styles.chevronUp : styles.chevron} aria-hidden="true">
          ^
        </span>
      </button>
      {open ? (
        <>
          <span className={styles.backdrop} onClick={() => setOpen(false)} aria-hidden="true" />
          <span className={styles.panel} role="listbox" aria-label={label}>
            {showSearch ? (
              <span className={styles.searchRow}>
                <SearchIcon size={15} className={styles.searchIcon} />
                <input
                  type="search"
                  className={styles.search}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </span>
            ) : null}
            <span className={styles.options}>
              {visible.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={pending === option.value}
                  className={styles.option}
                  onClick={() => setPending(pending === option.value ? defaultValue : option.value)}
                >
                  <span
                    className={pending === option.value ? styles.checkOn : styles.check}
                    aria-hidden="true"
                  >
                    {pending === option.value ? "✓" : ""}
                  </span>
                  {option.chip ? (
                    <span className={styles.chip} data-tone={option.chip.tone}>
                      {option.chip.Icon ? <option.chip.Icon size={12} strokeWidth={2} /> : null}
                      {option.chip.label}
                    </span>
                  ) : null}
                  {option.text ? <span className={styles.optionText}>{option.text}</span> : null}
                  {option.count !== undefined ? (
                    <span className={styles.optionCount}>{option.count}</span>
                  ) : null}
                </button>
              ))}
              {visible.length === 0 ? (
                <span className={styles.noOptions}>No options match.</span>
              ) : null}
            </span>
            <span className={styles.footer}>
              <button
                type="button"
                className={styles.reset}
                onClick={() => setPending(defaultValue)}
              >
                Reset
              </button>
              <button
                type="button"
                className={styles.apply}
                onClick={() => {
                  apply(pending);
                  setOpen(false);
                }}
              >
                Apply
              </button>
            </span>
          </span>
        </>
      ) : null}
    </span>
  );
}
