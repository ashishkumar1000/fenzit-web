import type { ChangeEvent } from "react";
import { Button } from "../../../components/ui/Button";
import type { CountryCode } from "../../../services/countryCodes";
import { SectionCard } from "../components/SectionCard";
import { TableSkeleton } from "../components/Table";
import { ImportFormatPanel } from "./ImportFormatPanel";
import { ImportPreviewTable } from "./ImportPreviewTable";
import { ImportResults } from "./ImportResults";
import { importButtonLabel, submitBlockedReason, summarise } from "./importSummary";
import { useImportSheet } from "./useImportSheet";
import styles from "./BulkImportPanel.module.css";

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
            <ImportPreviewTable
              rows={sheet.rows}
              disabled={busy}
              onEdit={importer.editCell}
              onBlur={importer.recheckIfNeeded}
              onFetch={(index) => void importer.fetchLocation(index)}
            />
            <div className={styles.submit}>
              <Button
                size="large"
                disabled={blockedReason !== null}
                describedBy={blockedReason ? "import-submit-why" : undefined}
                onClick={() => void importer.submit()}
              >
                {importButtonLabel(summary.ready)}
              </Button>
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
              <Button
                variant="secondary"
                disabled={commit.state === "submitting"}
                describedBy={commit.state === "submitting" ? "import-reset-why" : undefined}
                onClick={importer.reset}
              >
                Start over
              </Button>
              {commit.state === "submitting" ? (
                <p id="import-reset-why" className={styles.note}>
                  You cannot start over while the import is running.
                </p>
              ) : null}
            </div>
            {commit.state === "done" ? (
              <ImportResults result={commit.result} rows={sheet.rows} />
            ) : null}
          </>
        ) : null}
      </div>
    </SectionCard>
  );
}
