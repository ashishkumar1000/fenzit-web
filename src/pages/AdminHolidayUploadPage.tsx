import { Link, useLoaderData, useRevalidator } from "react-router";
// eslint-disable-next-line no-restricted-imports -- the only effect here is the confirm popup's showModal() on a conditionally-mounted <dialog> (UI lifecycle, not server data in an effect).
import { useEffect, useRef, useState } from "react";
import type { adminHolidayUploadLoader } from "../features/admin/holidayLoaders";
import { Tabs } from "../features/admin/components/Tabs";
import {
  GlyphCheckCircle,
  GlyphCloudUpload,
  GlyphDownload,
  GlyphPaperclip,
  GlyphShield,
} from "../features/admin/components/glyphs";
import { HOLIDAY_TABS } from "../features/admin/holidayTabs";
import { holidaysOfficeLine } from "../features/admin/holidaysMath";
import {
  classifyHolidayRows,
  readHolidaySheet,
  type ClassifiedHolidayRow,
  type ExistingHolidayRow,
  type HolidaySheetProblem,
} from "../features/admin/holidaysBulkSheet";
import {
  bulkUploadHolidays,
  downloadHolidayTemplate,
  type HolidayBulkRowError,
  type HolidayRow,
} from "../features/admin/companyApi";
import { readSession } from "../services/session";
import { ApiError } from "../services/api";
import { istToday } from "../features/admin/format";
import headerStyles from "./HolidaysSchedulePage.module.css";
import styles from "./AdminHolidayUploadPage.module.css";

/**
 * The holidays section's third tab (2026-11-26): bulk upload. The owner
 * downloads the .xlsx sheet — PRE-FILLED with the holidays already on the
 * calendar — adds new rows below them or EDITS a pre-filled row (name,
 * description, offices), and uploads it back. The browser checks the sheet
 * FIRST (the same rules the backend runs), then a popup classifies every row
 * — New / Changed / already there — with plain-English warnings for the
 * classic mistakes (an old sheet, a past date, a name typed twice); only on
 * confirm does anything touch the database. One bad row changes nothing.
 */

/** The weekday a date falls on, UTC-anchored so the label matches the
 *  calendar date everywhere ("Fri"). */
function weekdayOf(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-IN", {
    weekday: "short",
    timeZone: "UTC",
  });
}

/** Above this many overrides, the popup suspects a stale sheet. */
const BIG_CHANGE_WARN = 10;

type UploadState =
  | { phase: "idle" }
  | { phase: "downloading" }
  | { phase: "reading" }
  | {
      phase: "confirm";
      file: File;
      rows: ClassifiedHolidayRow[];
      generatedOn: string | null;
    }
  | {
      phase: "uploading";
      file: File;
      rows: ClassifiedHolidayRow[];
      generatedOn: string | null;
    }
  | {
      phase: "done";
      created: number;
      updated: number;
      skippedCount: number;
      holidays: HolidayRow[];
      updates: Array<{ date: string; oldName: string; newName: string }>;
    }
  | { phase: "rowErrors"; errors: HolidaySheetProblem[] }
  | { phase: "failed"; message: string };

export function AdminHolidayUploadPage() {
  const data = useLoaderData<typeof adminHolidayUploadLoader>();
  if (data.state === "failed") {
    return (
      <section className={styles.card}>
        <p className={headerStyles.empty} role="alert">
          The bulk upload could not load. Open this page again from the sidebar to retry.
        </p>
      </section>
    );
  }

  const { overview, existing, selfName } = data;
  const officeLine = holidaysOfficeLine(overview.offices);

  return (
    <div className={headerStyles.page}>
      <header className={headerStyles.head}>
        <nav className={headerStyles.crumbs} aria-label="Breadcrumb">
          <Link to="/admin" className={headerStyles.crumbLink}>
            Workspace
          </Link>
          <span className={headerStyles.crumbSep} aria-hidden="true">
            ›
          </span>
          <Link to="/admin/company" className={headerStyles.crumbLink}>
            Settings
          </Link>
          <span className={headerStyles.crumbSep} aria-hidden="true">
            ›
          </span>
          <span className={headerStyles.crumbHere} aria-current="page">
            Holidays &amp; Time-off
          </span>
        </nav>
        <div className={headerStyles.headRow}>
          <div>
            <h1 className={headerStyles.title}>
              {selfName === null ? "Hello" : `Hello, ${selfName}`}
            </h1>
            <p className={headerStyles.subtitle}>{officeLine}</p>
          </div>
        </div>
      </header>

      <Tabs basePath="/admin/company/holidays" tabs={[...HOLIDAY_TABS]} current="upload" />

      <UploadPanel offices={overview.offices} existing={existing} />
    </div>
  );
}

/** The upload flow — download, fill, check, confirm, apply. Own state machine
 *  so a sheet can be fixed and re-uploaded without leaving the page. */
function UploadPanel({
  offices,
  existing,
}: {
  offices: { officeId: string; name: string }[];
  existing: ExistingHolidayRow[];
}) {
  const [state, setState] = useState<UploadState>({ phase: "idle" });
  const [dragOver, setDragOver] = useState(false);
  const revalidator = useRevalidator();

  const token = readSession()?.token ?? null;

  // The sheet's office NAMES resolve to ids here — the popup's Changed
  // classification compares the sheet's names against the stored office ids.
  const officeIdByName = new Map(offices.map((o) => [o.name.toLowerCase(), o.officeId] as const));

  const downloadTemplate = async () => {
    if (token === null || state.phase === "downloading") return;
    setState({ phase: "downloading" });
    try {
      const blob = await downloadHolidayTemplate(token);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      // The date in the name IS the freshness cue: a year-old file on the
      // desktop reads as "check this is still current" before it is opened.
      anchor.download = `fenzit-holidays-${istToday()}.xlsx`;
      anchor.click();
      URL.revokeObjectURL(url);
      setState({ phase: "idle" });
    } catch {
      setState({
        phase: "failed",
        message: "The sheet could not be downloaded. Check your connection and try again.",
      });
    }
  };

  /** Step 1 of the upload: read + validate IN THE BROWSER — the same checks
   *  the backend runs. Problems fill the error table with no network call;
   *  a clean sheet opens the confirm popup instead. */
  const readSheet = async (file: File) => {
    // The route is owner-gated, so a null token means the session died
    // mid-view (logout in another tab) — say so instead of a silent no-op.
    if (token === null) {
      setState({ phase: "failed", message: "Session expired — reload the page to sign in again." });
      return;
    }
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setState({
        phase: "failed",
        message: "That is not an Excel sheet. Upload the .xlsx file you downloaded from here.",
      });
      return;
    }
    // The page promises "up to 10MB" — enforce the promise HERE, before the
    // browser parse and the 413 round trip.
    if (file.size > 10 * 1024 * 1024) {
      setState({
        phase: "failed",
        message: "That file is over 10MB. Split the sheet — upload the newest rows first.",
      });
      return;
    }
    setState({ phase: "reading" });
    const { rows, problems, generatedOn } = await readHolidaySheet(file, offices);
    if (problems.length > 0) {
      setState({ phase: "rowErrors", errors: problems });
      return;
    }
    if (rows.length === 0) {
      // A sheet with no rows at all (e.g. the header-only grid that ships
      // before the calendar has anything) — the popup would be empty.
      setState({
        phase: "rowErrors",
        errors: [
          {
            row: 0,
            date: null,
            name: null,
            message:
              "The sheet has no holidays on it. Add the new holidays below the pre-filled rows, or pick the sheet you downloaded from this page.",
          },
        ],
      });
      return;
    }
    setState({
      phase: "confirm",
      file,
      rows: classifyHolidayRows(rows, existing, officeIdByName),
      generatedOn,
    });
  };

  /** Step 2: the popup was confirmed — now the backend re-checks everything
   *  and applies every add and override in one transaction. */
  const confirmUpload = async (file: File) => {
    if (token === null || state.phase !== "confirm") return;
    const classified = state.rows;
    setState({
      phase: "uploading",
      file,
      rows: classified,
      generatedOn: state.generatedOn,
    });
    try {
      const result = await bulkUploadHolidays(token, file);
      // The loader's snapshot (the N-holidays caption, `existing`, the
      // classification) describes the PRE-upload calendar — refresh it, or a
      // second sheet in this session classifies against stale data.
      void revalidator.revalidate();
      setState({
        phase: "done",
        created: result.created,
        updated: result.updated,
        skippedCount: result.skipped,
        holidays: result.holidays,
        updates: result.updates.map((holiday) => ({
          date: holiday.date,
          oldName:
            classified.find((row) => row.date === holiday.date)?.existingName ?? holiday.name,
          newName: holiday.name,
        })),
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
        const errors = (error.body as { errors?: HolidayBulkRowError[] } | undefined)?.errors;
        if (Array.isArray(errors) && errors.length > 0) {
          // The sheet matched the calendar at check time but not at post
          // time (someone else edited) — the backend's rows are the truth.
          setState({ phase: "rowErrors", errors });
          return;
        }
      }
      if (error instanceof ApiError && error.status === 413) {
        setState({
          phase: "failed",
          message: "The sheet is too large. Upload the holidays in two smaller sheets.",
        });
        return;
      }
      setState({
        phase: "failed",
        message:
          error instanceof ApiError && error.status === 0
            ? error.message
            : "The sheet could not be uploaded. Check your connection and try again.",
      });
    }
  };

  const onPick = (file: File | undefined) => {
    if (file !== undefined) void readSheet(file);
  };

  return (
    <section className={styles.card}>
      <div className={styles.titleRow}>
        <h2 className={styles.panelTitle}>Add Many Holidays at Once</h2>
        <span className={styles.titleChip}>Batch Processing</span>
      </div>
      <p className={styles.panelSub}>
        Add several holidays together using an Excel sheet. Download the pre-formatted sheet, add
        new national/regional holidays or update existing ones, and upload it here.
      </p>
      <p className={styles.safeLine}>
        <GlyphCheckCircle size={15} />
        <span>
          <strong>Safe Preview:</strong> You can review and verify all changes before saving.
          Nothing will be committed until you confirm.
        </span>
      </p>

      <ol className={styles.steps}>
        <li className={styles.step}>
          <span className={styles.stepNum} aria-hidden="true">
            1
          </span>
          <div className={styles.stepInner}>
            <p className={styles.stepTitle}>Download the Excel Sheet</p>
            <p className={styles.stepText}>
              Download the sheet to see your existing holidays and office names.
            </p>
            <ul className={styles.stepList}>
              <li>Your current holidays are already pre-filled.</li>
              <li>You can add new holidays.</li>
              <li>You can update details of existing holidays.</li>
              <li>Use the exact office branch names shown in the template.</li>
            </ul>
            <button
              type="button"
              className={styles.stepButton}
              onClick={() => void downloadTemplate()}
              disabled={state.phase === "downloading"}
            >
              {state.phase === "downloading" ? (
                "Preparing…"
              ) : (
                <>
                  <GlyphDownload size={15} /> Download Excel Sheet
                </>
              )}
            </button>
            <p className={styles.stepCaption}>Includes {existing.length} holidays · .XLSX format</p>
          </div>
        </li>
        <li className={styles.step}>
          <span className={styles.stepNum} aria-hidden="true">
            2
          </span>
          <div className={styles.stepInner}>
            <p className={styles.stepTitle}>Add or Update Holidays</p>
            <p className={styles.stepText}>Open the downloaded sheet and make your changes.</p>
            <ul className={styles.stepList}>
              <li>Add one holiday in each row.</li>
              <li>
                Enter the date in <code className={styles.dateChip}>YYYY-MM-DD</code> format
                (example: 2026-08-15).
              </li>
              <li>Enter the holiday name (e.g., Independence Day).</li>
              <li>Add a description if needed (optional).</li>
              <li>Leave the Offices column empty if the holiday applies to all offices.</li>
              <li>
                If the holiday applies only to some offices, enter their names separated by commas.
              </li>
            </ul>
            <p className={styles.updateCallout}>
              <strong>Updating an existing holiday:</strong> change the details in its existing row.
              Leave the row unchanged if you don't want to update that holiday.
            </p>
          </div>
        </li>
        <li className={styles.step}>
          <span className={styles.stepNum} aria-hidden="true">
            3
          </span>
          <div className={styles.stepInner}>
            <p className={styles.stepTitle}>Review and Save</p>
            <p className={styles.stepText}>Upload your completed Excel sheet here to validate:</p>
            <ul className={styles.stepList}>
              <li>We will automatically check every row for formatting mistakes.</li>
              <li>
                If something is incorrect, nothing will be saved and errors will be highlighted.
              </li>
              <li>
                You will see an interactive summary of new holidays and changes to existing ones.
              </li>
              <li>Review the proposed changes and confirm to publish them instantly.</li>
            </ul>
            <p className={styles.validChip}>
              <GlyphShield size={14} /> Automated syntax validation
            </p>
            {/* Invisible twin of the count caption — reserves the same line so
                the chip's bottom edge matches the download button's across the
                equal-height cards. */}
            <p className={styles.stepCaption} aria-hidden="true">
              &nbsp;
            </p>
          </div>
        </li>
      </ol>

      {state.phase === "done" ? (
        <DoneCard
          created={state.created}
          updated={state.updated}
          skippedCount={state.skippedCount}
          holidays={state.holidays}
          updates={state.updates}
          onAgain={() => setState({ phase: "idle" })}
        />
      ) : state.phase === "rowErrors" ? (
        <div className={styles.errorCard} role="alert">
          <p className={styles.errorTitle}>
            Nothing was changed — {state.errors.length} row{state.errors.length === 1 ? "" : "s"}{" "}
            need{state.errors.length === 1 ? "s" : ""} fixing:
          </p>
          <table className={styles.errorTable}>
            <thead>
              <tr>
                <th scope="col">Sheet row</th>
                <th scope="col">Holiday</th>
                <th scope="col">What to fix</th>
              </tr>
            </thead>
            <tbody>
              {state.errors.map((rowError) => (
                <tr key={`${rowError.row}-${rowError.message}`}>
                  <td>{rowError.row}</td>
                  <td>
                    {rowError.name ?? "—"}
                    {rowError.date !== null ? (
                      <span className={styles.errorDate}> · {rowError.date}</span>
                    ) : null}
                  </td>
                  <td>{rowError.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            type="button"
            className={styles.againButton}
            onClick={() => setState({ phase: "idle" })}
          >
            Upload a fixed sheet
          </button>
        </div>
      ) : state.phase === "failed" ? (
        <div className={styles.errorCard} role="alert">
          <p className={styles.errorTitle}>{state.message}</p>
          <button
            type="button"
            className={styles.againButton}
            onClick={() => setState({ phase: "idle" })}
          >
            Try again
          </button>
        </div>
      ) : (
        <label
          className={
            state.phase === "reading"
              ? `${styles.dropzone} ${styles.dropzoneBusy}`
              : dragOver
                ? `${styles.dropzone} ${styles.dropzoneOver}`
                : styles.dropzone
          }
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            onPick(event.dataTransfer.files[0]);
          }}
        >
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className={styles.fileInput}
            disabled={state.phase === "reading"}
            onChange={(event) => {
              onPick(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          {state.phase === "reading" ? (
            <span className={styles.dropzoneTitle}>Checking the sheet…</span>
          ) : (
            <>
              <span className={styles.dropzoneTile} aria-hidden="true">
                <GlyphCloudUpload size={26} />
              </span>
              <span className={styles.dropzoneTitle}>
                Drag and drop your completed Excel sheet here, or click to select a file.
              </span>
              <span className={styles.dropzoneSub}>
                Upload the <strong>.xlsx</strong> file you downloaded from this page. Supports Excel
                files up to 10MB.
              </span>
              <span className={styles.dropzoneButton} aria-hidden="true">
                <GlyphPaperclip size={18} /> Browse Files
              </span>
            </>
          )}
        </label>
      )}

      {(state.phase === "confirm" || state.phase === "uploading") && token !== null ? (
        <ConfirmPopup
          rows={state.rows}
          generatedOn={state.generatedOn}
          busy={state.phase === "uploading"}
          onCancel={() => setState({ phase: "idle" })}
          onConfirm={() => void confirmUpload(state.file)}
        />
      ) : null}
    </section>
  );
}

/** The confirm popup: every sheet row classified the way the backend will
 *  land it (New / Changed / already there), a weekday beside each date, and
 *  plain-English warnings for the classic mistakes. Nothing touches the
 *  database before the confirm button. */
function ConfirmPopup({
  rows,
  generatedOn,
  busy,
  onCancel,
  onConfirm,
}: {
  rows: ClassifiedHolidayRow[];
  generatedOn: string | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  const newRows = rows.filter((row) => row.status === "new");
  const changedRows = rows.filter((row) => row.status === "changed");
  const sameRows = rows.filter((row) => row.status === "same");

  // --- The mistake catches (warnings only — the confirm stays available) ---
  const today = istToday();
  const warnings: string[] = [];
  // 1. An old sheet: the pre-filled rows are a snapshot, so an old upload
  //    could quietly overwrite newer edits with its own stale copies.
  if (generatedOn !== null && generatedOn < today) {
    warnings.push(
      `This sheet was downloaded on ${generatedOn} — the calendar may have changed since. If unsure, download a fresh sheet and copy your edits across.`,
    );
  }
  // 2. A big override batch is the stale-sheet signature too — renaming 30
  //    holidays by hand is unusual; re-using an old sheet is not.
  if (changedRows.length > BIG_CHANGE_WARN) {
    warnings.push(
      `This sheet would change ${changedRows.length} holidays already on your calendar — if you only meant to add new ones, you may have edited the pre-filled rows by accident.`,
    );
  }
  // 3. A past date on a NEW row is usually a typo'd year (already-there rows
  //    carry no decision — they exist on the calendar whatever today is).
  const pastNew = newRows.filter((row) => row.date < today);
  if (pastNew.length > 0) {
    warnings.push(
      `${pastNew.length} new holiday${pastNew.length === 1 ? " is" : "s are"} for a date already past — double-check the year if that is not intended.`,
    );
  }
  // 4. The same name twice IN ONE YEAR is usually a paste slip (or two rows
  //    that were meant to be one). Year-scoped: the pre-filled sheet
  //    legitimately repeats annual holidays across years.
  const byName = new Map<string, { name: string; year: string; dates: Set<string> }>();
  for (const row of rows) {
    const year = row.date.slice(0, 4);
    const key = `${row.name.toLowerCase()}·${year}`;
    const entry = byName.get(key) ?? { name: row.name, year, dates: new Set<string>() };
    entry.dates.add(row.date);
    byName.set(key, entry);
  }
  const dupNames = [...byName.values()].filter((entry) => entry.dates.size > 1);
  for (const dup of dupNames.slice(0, 3)) {
    warnings.push(
      `"${dup.name}" appears on ${dup.dates.size} dates in ${dup.year} — check those rows are intended.`,
    );
  }

  const nothingToDo = newRows.length === 0 && changedRows.length === 0;

  const countPart =
    newRows.length === 0 ? null : `Add ${newRows.length} holiday${newRows.length === 1 ? "" : "s"}`;
  const changePart =
    changedRows.length === 0
      ? null
      : `Update ${changedRows.length} holiday${changedRows.length === 1 ? "" : "s"}`;
  const title =
    countPart === null && changePart === null
      ? "Nothing to change"
      : countPart === null
        ? `${changePart}?`
        : changePart === null
          ? `${countPart} to the calendar?`
          : `${countPart} · ${changePart}?`;

  const subParts = [
    countPart === null
      ? null
      : `${newRows.length} new holiday${newRows.length === 1 ? "" : "s"} will be added`,
    changePart === null
      ? null
      : `${changedRows.length} existing holiday${changedRows.length === 1 ? "" : "s"} will be updated in place`,
    sameRows.length === 0
      ? null
      : `${sameRows.length} row${sameRows.length === 1 ? "" : "s"} will stay unchanged`,
  ].filter((part): part is string => part !== null);

  return (
    <dialog
      ref={dialogRef}
      className={styles.modal}
      aria-labelledby="holiday-confirm-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
    >
      <div className={styles.modalBody}>
        <h3 id="holiday-confirm-title" className={styles.modalTitle}>
          {title}
        </h3>
        <p className={styles.modalSub}>
          {subParts.length === 0
            ? "Every row of this sheet is already on your calendar exactly as written — nothing will change."
            : subParts.join(" · ") + "."}
        </p>

        {warnings.length > 0 ? (
          <div className={styles.modalWarn} role="alert">
            <ul>
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className={styles.modalScroll}>
          <table className={styles.modalTable}>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Holiday</th>
                <th scope="col">Offices</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.row}>
                  <td className={styles.modalDate}>
                    {row.date}
                    <span className={styles.modalWeekday}>{weekdayOf(row.date)}</span>
                  </td>
                  <td>
                    {row.name}
                    {row.description !== null ? (
                      <span className={styles.modalDesc}> · {row.description}</span>
                    ) : null}
                    {row.status === "changed" && row.existingName !== undefined ? (
                      <span className={styles.badgeWas}>was: {row.existingName}</span>
                    ) : null}
                  </td>
                  <td>{row.scope === "all" ? "All offices" : row.officeNames.join(", ")}</td>
                  <td>
                    {row.status === "new" ? (
                      <span className={styles.badgeNew}>New</span>
                    ) : row.status === "changed" ? (
                      <span className={styles.badgeChanged}>Changed</span>
                    ) : (
                      <span className={styles.badgeSkip}>Already there</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.modalActions}>
          <button type="button" className={styles.modalGhost} onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.modalPrimary}
            onClick={onConfirm}
            disabled={busy || nothingToDo}
          >
            {busy
              ? "Saving…"
              : nothingToDo
                ? "Nothing to change"
                : countPart !== null && changePart !== null
                  ? `${countPart} · ${changePart}`
                  : (countPart ?? changePart)}
          </button>
        </div>
      </div>
    </dialog>
  );
}

/** The success card: what was added, what was updated (old name → new), what
 *  stayed untouched, and the honest note that bulk imports stay silent. */
function DoneCard({
  created,
  updated,
  skippedCount,
  holidays,
  updates,
  onAgain,
}: {
  created: number;
  updated: number;
  skippedCount: number;
  holidays: HolidayRow[];
  updates: Array<{ date: string; oldName: string; newName: string }>;
  onAgain: () => void;
}) {
  return (
    <div className={styles.doneCard} role="status">
      <p className={styles.doneTitle}>
        {[
          created > 0 ? `Added ${created} holiday${created === 1 ? "" : "s"}` : null,
          updated > 0 ? `Updated ${updated} holiday${updated === 1 ? "" : "s"}` : null,
        ]
          .filter((part): part is string => part !== null)
          .join(" · ") || "Nothing was changed."}
      </p>
      {holidays.length > 0 ? (
        <ul className={styles.doneList}>
          {holidays.map((holiday) => (
            <li key={holiday.id} className={styles.doneRow}>
              <span className={styles.doneDate}>{holiday.date}</span>
              <span className={styles.doneName}>{holiday.name}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {updates.length > 0 ? (
        <ul className={styles.doneList}>
          {updates.map((update) => (
            <li key={update.date} className={styles.doneRow}>
              <span className={styles.doneDate}>{update.date}</span>
              <span className={styles.doneName}>
                {update.oldName === update.newName ? (
                  update.newName
                ) : (
                  <>
                    {update.oldName}
                    <span className={styles.badgeWas}> → {update.newName}</span>
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {skippedCount > 0 ? (
        <p className={styles.doneNote}>
          {skippedCount} row{skippedCount === 1 ? "" : "s"} left unchanged — already on your
          calendar exactly as written.
        </p>
      ) : null}
      <p className={styles.doneNote}>
        The calendar and every employee's day statuses update on their own. Bulk uploads stay silent
        — no per-holiday notifications go out.
      </p>
      <Link to="/admin/company/holidays" className={styles.doneLink}>
        Open the calendar →
      </Link>
      <button type="button" className={styles.againButton} onClick={onAgain}>
        Upload another sheet
      </button>
    </div>
  );
}
