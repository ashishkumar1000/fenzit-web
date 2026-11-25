import { useState } from "react";
import { fetchJobsPage } from "../companyApi";
import { readSession } from "../../../services/session";
import { Spinner } from "../../../components/ui/Spinner";
import { DownloadIcon } from "../../../components/ui/consoleIcons";
import { humanize } from "../status";
import styles from "./JobsExport.module.css";

/** The CSV's schedule stamp: the day and the time together, India time — the
 *  console's shared day boundary, the same words the table renders. */
const CSV_STAMP = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

function formatStampForCsv(iso: string | null): string {
  if (iso === null) return "";
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return iso;
  return CSV_STAMP.format(at);
}

/** A typed-in cell that starts with = + - or @ would run as a formula in a
 *  spreadsheet, so a leading apostrophe makes it plain text. Applied to the
 *  free-text cells only: numbers and fixed words never start with those. */
function guardFormula(text: string): string {
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

/** Builds the whole book's CSV in the browser and saves it — every job, not
 *  just the one page on screen, so the export matches what the owner manages.
 *  The endpoint pages at ≤100 rows, so the walk is bounded and shows
 *  progress. */
async function downloadJobsCsv(onProgress: (done: number) => void): Promise<void> {
  const token = readSession()?.token;
  // Throw rather than return: the button shows the error, so a missing
  // session never looks like a click that did nothing.
  if (token === undefined) throw new Error("No session");
  const quote = (cell: string): string => `"${cell.replace(/"/g, '""')}"`;
  const header = [
    "Job number",
    "Job Description",
    "Customer",
    "Employee",
    "Work Type",
    "Status",
    "Priority",
    "Location",
    "Scheduled Date",
    "Completed Date",
  ].join(",");
  const lines: string[] = [header];
  const PAGE = 100;
  let page = 1;
  // The do-while assigns pages before it reads them — the first body run
  // always happens.
  let pages: number;
  do {
    const result = await fetchJobsPage(token, { page, pageSize: PAGE });
    pages = result.pages;
    for (const j of result.data) {
      lines.push(
        [
          quote(j.jobNumber),
          quote(guardFormula(j.description ?? "")),
          quote(guardFormula(j.customer?.name ?? "")),
          quote(guardFormula(j.technician?.name ?? "")),
          quote(guardFormula(j.skill?.name ?? "")),
          quote(humanize(j.status)),
          quote(j.priority === null ? "" : humanize(j.priority)),
          quote(guardFormula(j.serviceLocation)),
          quote(formatStampForCsv(j.scheduledStart)),
          quote(formatStampForCsv(j.completedAt)),
        ].join(","),
      );
    }
    // The last page is partial — never report more rows than exist.
    onProgress(Math.min(page * PAGE, result.total));
    page += 1;
  } while (page <= pages);
  // The byte-order mark makes Excel read the file as UTF-8, so accented
  // names do not garble.
  const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "jobs.csv";
  // Some browsers (Safari) cancel a download whose link is not in the page,
  // or whose URL is revoked in the same tick as the click.
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function ExportJobsButton() {
  const [error, setError] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  return (
    <span className={styles.exportWrap}>
      <button
        type="button"
        className={styles.secondaryButton}
        disabled={building}
        onClick={() => {
          setError(null);
          setProgress(null);
          setBuilding(true);
          downloadJobsCsv((done) => setProgress(`${done} jobs downloaded…`))
            .catch(() => setError("We could not create the file. Please try again."))
            .finally(() => setBuilding(false));
        }}
      >
        {building ? <Spinner size={14} /> : <DownloadIcon size={15} strokeWidth={2} />}
        {building ? (progress ?? "Preparing…") : "Download Jobs List"}
      </button>
      {error ? (
        <p className={styles.exportError} role="alert">
          {error}
        </p>
      ) : null}
    </span>
  );
}
