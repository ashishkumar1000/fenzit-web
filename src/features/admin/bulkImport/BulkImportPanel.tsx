import type { ChangeEvent } from "react";
import { Button } from "../../../components/ui/Button";
import type { CountryCode } from "../../../services/countryCodes";
import { SectionCard } from "../components/SectionCard";
import { TableSkeleton } from "../components/Table";
import { ImportFormatPanel } from "./ImportFormatPanel";
import { ImportPreviewTable } from "./ImportPreviewTable";
import type { BulkProgress } from "./useImportSheet";
import { isReadyForLocation, needsLocation } from "./locationFill";
import { ADDRESS_MIN_LENGTH } from "./addressRules";
import { ImportResults } from "./ImportResults";
import { importButtonLabel, submitBlockedReason, summarise } from "./importSummary";
import type { SheetRow } from "./importModel";
import { useImportSheet } from "./useImportSheet";
import styles from "./BulkImportPanel.module.css";

type LocationBarProps = {
  rows: SheetRow[];
  checking: boolean;
  imported: boolean;
  progress: BulkProgress | null;
  onFetchAll: () => void;
};

/** One button that looks up every row still missing coordinates. Says why when it is off. */
function LocationBar({ rows, checking, imported, progress, onFetchAll }: LocationBarProps) {
  const count = rows.filter((row) => needsLocation(row) && isReadyForLocation(row)).length;
  const fixFirst = count === 0 && rows.some(needsLocation);
  const running = progress !== null;
  const hasAddress = rows.some((row) => row.cells.address.trim().length >= ADDRESS_MIN_LENGTH);
  const why = running
    ? null
    : checking
      ? "Wait for the check to finish before fetching locations."
      : imported
        ? "This sheet is already imported, so its locations cannot change."
        : fixFirst
          ? "Fix the rows that need fixing first. Only Ready rows get a lookup."
          : !hasAddress
            ? "Add an address to a row first."
            : count === 0
              ? "Every row with an address already has a location."
              : null;
  const label = running
    ? progress.paused
      ? `Paused by the server limit: ${progress.done} of ${progress.total} done`
      : `Fetching ${progress.done} of ${progress.total}…`
    : `Fetch locations for ${count} ${count === 1 ? "row" : "rows"}`;
  return (
    <div className={styles.locationBar}>
      <Button
        variant="secondary"
        disabled={running || checking || imported || count === 0}
        describedBy={why ? "location-why" : undefined}
        onClick={onFetchAll}
      >
        {label}
      </Button>
      {why ? (
        <p id="location-why" className={styles.note}>
          {why}
        </p>
      ) : null}
    </div>
  );
}

type BulkImportPanelProps = {
  /** The company staff picked on this page, or null. Every call goes to this company only. */
  companyId: string | null;
  countries: CountryCode[];
};

/**
 * Staff bulk import of customers for the picked company: format, upload, preview
 * with per-row edits and location, then one submit. The panel is keyed by company
 * on the page, so a different company always starts from an empty sheet.
 */
export function BulkImportPanel({ companyId, countries }: BulkImportPanelProps) {
  const importer = useImportSheet(companyId);
  if (companyId === null) {
    return (
      <SectionCard title="Import customers">
        <p className={styles.note}>Pick a company above before you import its customers.</p>
      </SectionCard>
    );
  }

  const { sheet, commit, reading, readError, checking, checkError } = importer;
  const busy = commit.state === "submitting" || commit.state === "done";
  const summary = summarise(sheet?.rows ?? []);
  const blockedReason = submitBlockedReason({ commit: commit.state, checking, summary });

  function onFileChange(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void importer.loadFile(file);
  }

  return (
    <SectionCard title="Import customers from a sheet" meta={sheet?.fileName ?? null}>
      <div className={styles.stack}>
        <ImportFormatPanel
          countries={countries}
          dialCode={importer.dialCode}
          onDialCodeChange={importer.setDialCode}
          disabled={busy}
        />

        <div className={styles.upload}>
          <label className={styles.uploadButton}>
            Choose a .xlsx or .csv file
            <input
              type="file"
              accept=".xlsx,.csv"
              className={styles.fileInput}
              disabled={reading || busy}
              onChange={onFileChange}
            />
          </label>
          <p className={styles.note}>
            {sheet
              ? "Choosing a new file replaces the rows on this screen."
              : "No file chosen yet."}
          </p>
          {reading ? (
            <p className={styles.note} role="status">
              Reading your file…
            </p>
          ) : null}
          {readError ? (
            <p className={styles.error} role="alert">
              {readError}
            </p>
          ) : null}
        </div>

        {reading ? <TableSkeleton rows={4} /> : null}
        {!reading && sheet === null && readError === null ? (
          <p className={styles.note}>No rows yet. Choose a file above to see its rows here.</p>
        ) : null}

        {sheet && !reading ? (
          <>
            <p className={styles.summary} role="status">
              {summary.ready} ready, {summary.needsFixing} need fixing
              {summary.waiting > 0 ? `, ${summary.waiting} waiting for a check` : ""}.
            </p>
            {checking ? (
              <p className={styles.note} role="status">
                Checking the rows…
              </p>
            ) : null}
            {checkError ? (
              <div className={styles.errorRow} role="alert">
                <p className={styles.error}>{checkError}</p>
                <Button variant="secondary" disabled={checking} onClick={importer.retryCheck}>
                  Try the check again
                </Button>
              </div>
            ) : null}
            <LocationBar
              rows={sheet.rows}
              checking={checking}
              imported={busy}
              progress={importer.bulkLocation}
              onFetchAll={() => void importer.fetchAllLocations()}
            />
            <ImportPreviewTable
              rows={sheet.rows}
              disabled={busy}
              onEdit={importer.editCell}
              onBlur={importer.recheckIfNeeded}
              onFetch={(index) => void importer.fetchLocation(index)}
            />
            <div className={styles.submit}>
              <div className={styles.actions}>
                <Button
                  size="large"
                  disabled={blockedReason !== null}
                  describedBy={blockedReason ? "import-submit-why" : undefined}
                  onClick={() => void importer.submit()}
                >
                  {importButtonLabel(summary.ready)}
                </Button>
                <Button
                  variant="secondary"
                  disabled={commit.state === "submitting"}
                  describedBy={commit.state === "submitting" ? "import-reset-why" : undefined}
                  onClick={importer.reset}
                >
                  Start over
                </Button>
              </div>
              {blockedReason ? (
                <p id="import-submit-why" className={styles.note}>
                  {blockedReason}
                </p>
              ) : null}
              {commit.state === "error" ? (
                <p className={styles.error} role="alert">
                  {commit.message} Press the import button again to retry.
                </p>
              ) : null}
              {commit.state === "submitting" ? (
                <p id="import-reset-why" className={styles.note}>
                  You cannot start over while the import is running.
                </p>
              ) : null}
            </div>
            {commit.state === "done" ? <ImportResults result={commit.result} /> : null}
          </>
        ) : null}
      </div>
    </SectionCard>
  );
}
