import { useState } from "react";
import { fetchCustomersPage } from "../companyApi";
import { readSession } from "../../../services/session";
import { Spinner } from "../../../components/ui/Spinner";
import { DownloadIcon } from "../../../components/ui/consoleIcons";
import styles from "./CustomersExport.module.css";

/** The CSV's activity stamp is the screen's two lines joined — the same
 *  en-US parts the table renders — so the export and the table never
 *  disagree about the same customer. */
const CSV_DAY = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});
const CSV_TIME = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

function formatStampForCsv(iso: string | null): string {
  if (iso === null) return "";
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return iso;
  return `${CSV_DAY.format(at)} ${CSV_TIME.format(at)}`;
}

/** A typed-in cell that starts with = + - or @ would run as a formula in a
 *  spreadsheet, so a leading apostrophe makes it plain text. Applied to the
 *  free-text cells only: the phone is a fixed dial code plus digits. */
function guardFormula(text: string): string {
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

/** Builds the whole book's CSV in the browser and saves it — every page, not
 *  just the one on screen, so the export matches what the owner manages. The
 *  endpoint pages at ≤100 rows, so the walk is bounded and shows progress. */
async function downloadCustomersCsv(onProgress: (done: number) => void): Promise<void> {
  const token = readSession()?.token;
  // Throw rather than return: the button shows the error, so a missing
  // session never looks like a click that did nothing.
  if (token === undefined) throw new Error("No session");
  const quote = (cell: string): string => `"${cell.replace(/"/g, '""')}"`;
  const header = ["Name", "Phone", "Code", "Address", "City", "Jobs", "Last Job Date"].join(",");
  const lines: string[] = [header];
  const PAGE = 100;
  let page = 1;
  // The do-while assigns pages before it reads them — the first body run
  // always happens.
  let pages: number;
  do {
    const result = await fetchCustomersPage(token, { page, pageSize: PAGE });
    pages = result.pages;
    for (const c of result.data) {
      lines.push(
        [
          quote(guardFormula(c.name)),
          quote(`${c.countryCode} ${c.phoneNumber}`),
          quote(c.customerCode),
          quote(guardFormula(c.address ?? "")),
          quote(guardFormula(c.city ?? "")),
          String(c.jobCount),
          quote(formatStampForCsv(c.lastJobDate)),
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
  link.download = "customers.csv";
  // Some browsers (Safari) cancel a download whose link is not in the page,
  // or whose URL is revoked in the same tick as the click.
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function ExportCustomersButton() {
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
          downloadCustomersCsv((done) => setProgress(`${done} customers downloaded…`))
            .catch(() => setError("We could not create the file. Please try again."))
            .finally(() => setBuilding(false));
        }}
      >
        {building ? <Spinner size={14} /> : <DownloadIcon size={15} strokeWidth={2} />}
        {building ? (progress ?? "Preparing…") : "Download Customer List"}
      </button>
      {error ? (
        <p className={styles.exportError} role="alert">
          {error}
        </p>
      ) : null}
    </span>
  );
}
