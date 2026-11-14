import { useId, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import styles from "./Dropdown.module.css";

export interface DropdownOption {
  value: string;
  label: string;
  /** A quieter second line under the label (phone, code) — shown in the
   *  popup and folded into the search, so two employees with the same name
   *  stay tellable and a phone number or employee code finds its person. */
  meta?: string;
}

/** Digits only — a phone search must match however it is typed
 *  ("98354 20955", "+91 9835420955", or the raw digits). */
function digitsOf(text: string): string {
  return text.replace(/\D/g, "");
}

function searchHaystack(option: DropdownOption): string {
  return `${option.label} ${option.meta ?? ""}`.toLowerCase();
}

/**
 * A select-style dropdown we render ourselves — the browser's native popup
 * cannot be styled or positioned, and detached itself from the field on the
 * report card (found live 2026-11-14). The listbox is real DOM under the
 * control, so it always opens where the field is, and it carries a search
 * box so an owner with many employees finds theirs by name.
 *
 * ARIA combobox-with-listbox (APG): the search input inside the popup holds
 * focus and drives `aria-activedescendant`; ArrowDown/Up move the highlight,
 * Enter picks (the only candidate when the search narrows to one picks too),
 * Escape closes. Clicking outside closes — the control's blur reports where
 * focus went; option mousedowns are held back from blurring it, so a click
 * always reaches the option. Picking returns focus to the toggle.
 */
export function Dropdown({
  label,
  options,
  value,
  onChange,
}: {
  /** The visible field label, rendered above the control. */
  label: string;
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  /** The highlighted option in the filtered list (-1 = none). */
  const [active, setActive] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  const current = options.find((option) => option.value === value) ?? null;
  const needle = query.trim().toLowerCase();
  const needleDigits = digitsOf(needle);
  const filtered =
    needle === ""
      ? options
      : options.filter(
          (option) =>
            searchHaystack(option).includes(needle) ||
            (needleDigits.length > 0 && digitsOf(searchHaystack(option)).includes(needleDigits)),
        );

  const close = (focusToggle: boolean): void => {
    setOpen(false);
    setQuery("");
    setActive(-1);
    if (focusToggle) toggleRef.current?.focus();
  };

  const openAndFocus = (): void => {
    setOpen(true);
    setActive(-1);
    // The input takes focus on the next frame, once it exists.
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const scrollActive = (index: number): void => {
    document.getElementById(`${listId}-opt-${index}`)?.scrollIntoView({ block: "nearest" });
  };

  const pick = (index: number): void => {
    onChange(filtered[index].value);
    close(true);
  };

  const onKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = Math.min(active + 1, filtered.length - 1);
      setActive(next);
      scrollActive(next);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      const next = Math.max(active - 1, -1);
      setActive(next);
      if (next >= 0) scrollActive(next);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActive(filtered.length > 0 ? 0 : -1);
      if (filtered.length > 0) scrollActive(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActive(filtered.length - 1);
      scrollActive(filtered.length - 1);
    } else if (event.key === "Enter") {
      // An IME composition (Hindi, Japanese, …) uses Enter to commit the
      // text itself — that Enter must not pick an option underneath it.
      if (event.nativeEvent.isComposing) return;
      event.preventDefault();
      if (active >= 0) pick(active);
      else if (filtered.length === 1) pick(0);
    } else if (event.key === "Escape" || event.key === "Tab") {
      close(event.key === "Escape");
    }
  };

  return (
    <div
      ref={rootRef}
      className={styles.root}
      onBlur={(event) => {
        // Focus lives inside the root while the popup is up (the search box),
        // so a blur that reports a target outside means a click elsewhere.
        if (open && !rootRef.current?.contains(event.relatedTarget as Node | null)) {
          close(false);
        }
      }}
    >
      <span className={styles.label} id={`${listId}-label`}>
        {label}
      </span>
      <button
        ref={toggleRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${listId}-label ${listId}-value`}
        className={styles.control}
        onClick={() => (open ? close(true) : openAndFocus())}
      >
        <span className={styles.value} id={`${listId}-value`}>
          {/* A value no option carries (a stale edit form, mostly) still
              shows itself — an empty toggle reads as "the pick is lost". */}
          {current?.label ?? value}
        </span>
        <ChevronDown className={styles.chevron} aria-hidden="true" size={16} />
      </button>
      {open ? (
        <div
          className={styles.menu}
          // A press inside the popup must not blur the control: a
          // non-focusable option would drop focus to the body, the blur
          // would close the menu, and the click would land on nothing.
          onMouseDown={(event) => event.preventDefault()}
        >
          <div className={styles.search}>
            <Search className={styles.searchIcon} aria-hidden="true" size={14} />
            <input
              ref={inputRef}
              type="text"
              className={styles.searchInput}
              placeholder={`Search ${label.toLowerCase()}…`}
              aria-label={`Search ${label.toLowerCase()}`}
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-activedescendant={active >= 0 ? `${listId}-opt-${active}` : undefined}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(-1);
              }}
              onKeyDown={onKeyDown}
            />
          </div>
          {filtered.length === 0 ? (
            <p className={styles.empty}>No match for “{query.trim()}”.</p>
          ) : (
            <ul
              className={styles.list}
              role="listbox"
              aria-labelledby={`${listId}-label`}
              id={listId}
            >
              {filtered.map((option, index) => (
                <li
                  key={option.value === "" ? "all" : option.value}
                  role="option"
                  id={`${listId}-opt-${index}`}
                  aria-selected={option.value === value}
                  className={
                    index === active
                      ? styles.optionActive
                      : option.value === value
                        ? styles.optionSelected
                        : styles.option
                  }
                  onClick={() => pick(index)}
                  onMouseMove={() => setActive(index)}
                >
                  <span className={styles.optionLabel}>{option.label}</span>
                  {option.meta !== undefined && option.meta !== "" ? (
                    <span className={styles.optionMeta}>{option.meta}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
