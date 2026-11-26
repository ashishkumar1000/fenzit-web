import { useFetcher } from "react-router";
// eslint-disable-next-line no-restricted-imports -- the only effects here are showModal() on a conditionally-mounted <dialog> and closing it when the fetcher lands (UI lifecycle, not server data in an effect).
import { useEffect, useId, useRef, useState } from "react";
import type { HolidayOverview, HolidayRow } from "../companyApi";
import type { HolidayActionResult } from "../holidayLoaders";
import { Spinner } from "../../../components/ui/Spinner";
import { weekdayName } from "../leaveDateMath";
import styles from "./HolidayModal.module.css";

export interface HolidayModalSeed {
  /** create: the clicked calendar date prefilled. edit: the holiday's. */
  date: string;
  /** edit mode carries the holiday being changed. */
  holiday?: HolidayRow;
}

/**
 * The add/edit holiday dialog (2026-11-26 redesign): name, one-line
 * description, the date, and — when the tenant runs MORE THAN ONE office —
 * the office chips that carry per-office applicability ("All Offices" plus
 * one toggle chip per office; picking any office switches the save to scope
 * 'offices'). A single-office tenant skips the question entirely: every
 * holiday closes the one office, so the section is noise (owner call).
 * The design's "Send email notice" checkbox is deliberately OMITTED (owner
 * decision — the backend has no email transport; the push fan-out runs on
 * its own). Opened with showModal(), so the backdrop blurs the page and
 * background clicks are blocked while the sheet is up.
 */
export function HolidayModal({
  seed,
  overview,
  onClose,
}: {
  seed: HolidayModalSeed;
  overview: HolidayOverview;
  onClose: () => void;
}) {
  const editing = seed.holiday !== undefined;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const fetcher = useFetcher<HolidayActionResult>();
  const busy = fetcher.state !== "idle";
  const error = fetcher.data?.state === "error" ? fetcher.data.message : null;
  // One office = no applicability choice to make.
  const multiOffice = overview.offices.length > 1;

  const [name, setName] = useState(seed.holiday?.name ?? "");
  const [description, setDescription] = useState(seed.holiday?.description ?? "");
  const [date, setDate] = useState(seed.date);
  // [] = every office; any pick narrows the save to the named offices.
  const [picked, setPicked] = useState<string[]>(
    (seed.holiday?.scope ?? "all") === "offices" ? (seed.holiday?.officeIds ?? []) : [],
  );

  const toggle = (officeId: string) => {
    setPicked((current) =>
      current.includes(officeId) ? current.filter((id) => id !== officeId) : [...current, officeId],
    );
  };

  const close = () => {
    dialogRef.current?.close();
    onClose();
  };

  // The sheet mounts when opened (the pages render it conditionally), so the
  // mount effect is the showModal() call — the native `open` attribute would
  // skip the backdrop, the focus trap and the inert background. Guarded:
  // StrictMode double-runs mount effects and showModal() on an already-open
  // dialog throws (same guard as RejectDialog/JobSettingsDialog).
  useEffect(() => {
    if (dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
  }, []);

  // A done create/update closes the sheet (the page action revalidates the
  // loader around it); an error keeps it open with the message.
  useEffect(() => {
    if (fetcher.data?.state === "done") onClose();
  }, [fetcher.data, onClose]);

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) dialogRef.current?.close();
      }}
    >
      <fetcher.Form method="post" className={styles.form}>
        <input type="hidden" name="intent" value={editing ? "update" : "create"} />
        {editing ? <input type="hidden" name="id" value={seed.holiday!.id} /> : null}
        {/* The chips are toggle state only — these hidden fields are what
            actually ship the pick: none = every office (scope 'all'). */}
        {picked.map((officeId) => (
          <input key={officeId} type="hidden" name="officeId" value={officeId} />
        ))}
        <header className={styles.header}>
          <span className={styles.headerIcon} aria-hidden="true">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
            >
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M8 3v4M16 3v4M3 10h18" />
            </svg>
          </span>
          <div>
            <h3 id={titleId} className={styles.title}>
              {editing ? "Edit Holiday" : "Add New Holiday"}
            </h3>
            <p className={styles.hint}>Set up the holiday date and pick which offices it closes</p>
          </div>
          <button type="button" className={styles.close} onClick={close} aria-label="Close">
            ×
          </button>
        </header>

        <label className={styles.field}>
          <span className={styles.label}>
            Holiday Name <em className={styles.required}>*</em>
          </span>
          <input
            className={styles.input}
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            placeholder="e.g. Diwali, Eid, Republic Day"
            required
            /* showModal() focuses the first focusable element — the header's
               × button in DOM order. Autofocus starts owners on the field
               they opened the modal for. */
            autoFocus
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>
            Description{" "}
            <small className={styles.optional}>optional — the schedule's one-liner</small>
          </span>
          <input
            className={styles.input}
            name="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={280}
            placeholder="e.g. National holiday — festival of lights"
          />
        </label>

        <fieldset className={styles.dateBox}>
          <legend className={styles.dateLegend}>
            Holiday Date &amp; Timing <em className={styles.required}>*</em>
          </legend>
          <div className={styles.dateRow}>
            <label className={styles.dateField}>
              <span className={styles.miniLabel}>Select Date</span>
              <input
                className={styles.input}
                type="date"
                name="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                required
              />
            </label>
            <p className={styles.dateFact}>
              <span className={styles.miniLabel}>Falls on</span>
              <strong>{weekdayName(date) || "—"}</strong>
              <span className={styles.factTag}>Full Day Off</span>
            </p>
          </div>
          <p className={styles.dateNote}>Full day holiday for employees</p>
        </fieldset>

        {multiOffice ? (
          <fieldset className={styles.offices}>
            <legend className={styles.label}>
              Which Offices Does This Apply To? <em className={styles.required}>*</em>
            </legend>
            <p className={styles.officesMeta}>
              {picked.length === 0
                ? "Every office closes"
                : `${picked.length} office${picked.length === 1 ? "" : "s"} selected`}
            </p>
            <div className={styles.chipRow}>
              <button
                type="button"
                className={styles.chip}
                data-on={picked.length === 0}
                onClick={() => setPicked([])}
              >
                🌐 All Offices
              </button>
              {overview.offices.map((office) => (
                <button
                  key={office.officeId}
                  type="button"
                  className={styles.chip}
                  data-on={picked.includes(office.officeId)}
                  onClick={() => toggle(office.officeId)}
                >
                  🏢 {office.name}
                  {picked.includes(office.officeId) ? " ✓" : ""}
                </button>
              ))}
            </div>
          </fieldset>
        ) : null}

        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}

        <footer className={styles.actions}>
          <button type="button" className={styles.quietButton} onClick={close}>
            Cancel
          </button>
          {/* The page action revalidates the loader on success, so the new
              holiday is on the page the moment the dialog closes. */}
          <button type="submit" className={styles.saveButton} disabled={busy}>
            {busy ? <Spinner size={13} /> : null}
            {busy ? "Saving…" : editing ? "Save Changes" : "Save Holiday"}
          </button>
        </footer>
      </fetcher.Form>
    </dialog>
  );
}
