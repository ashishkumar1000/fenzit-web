import { useState } from "react";
import { fetchMembers } from "../companyApi";
import { humanize } from "../status";
import { ROLE_WORDS } from "../employeesLabels";
import { readSession } from "../../../services/session";
import { Spinner } from "../../../components/ui/Spinner";
import { DownloadIcon } from "../../../components/ui/consoleIcons";
import styles from "./EmployeesExport.module.css";

/** The CSV's joined date matches the screen's format, so the export and the
 *  table never disagree about the same person. */
const CSV_DAY = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

function formatDateForCsv(iso: string): string {
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? iso : CSV_DAY.format(at);
}

/** A typed-in cell that starts with = + - or @ would run as a formula in a
 *  spreadsheet, so a leading apostrophe makes it plain text. Applied to the
 *  free-text cells only: the phone is a fixed dial code plus digits. */
function guardFormula(text: string): string {
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

/** Builds the whole team's CSV in the browser and saves it — the full list,
 *  not just this page, so the export matches what the owner manages. */
async function downloadEmployeesCsv(): Promise<void> {
  const token = readSession()?.token;
  // Throw rather than return: the button shows the error, so a missing
  // session never looks like a click that did nothing.
  if (token === undefined) throw new Error("No session");
  const rows = await fetchMembers(token);
  const quote = (cell: string): string => `"${cell.replace(/"/g, '""')}"`;
  const lines = [
    ["Name", "Email", "Phone", "Employee Code", "Role", "Status", "Joined On"].join(","),
    ...rows.map((m) =>
      [
        quote(guardFormula(m.name ?? "")),
        quote(guardFormula(m.email ?? "")),
        quote(`${m.countryCode} ${m.phoneNumber}`),
        quote(guardFormula(m.employeeCode)),
        quote(ROLE_WORDS[m.role] ?? humanize(m.role)),
        quote(humanize(m.status)),
        quote(formatDateForCsv(m.createdAt)),
      ].join(","),
    ),
  ];
  // The byte-order mark makes Excel read the file as UTF-8, so accented
  // names do not garble.
  const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "employees.csv";
  // Some browsers (Safari) cancel a download whose link is not in the page,
  // or whose URL is revoked in the same tick as the click.
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function ExportCsvButton() {
  const [error, setError] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  return (
    <span className={styles.exportWrap}>
      <button
        type="button"
        className={styles.secondaryButton}
        disabled={building}
        onClick={() => {
          setError(null);
          setBuilding(true);
          downloadEmployeesCsv()
            .catch(() => setError("We could not create the file. Please try again."))
            .finally(() => setBuilding(false));
        }}
      >
        {building ? <Spinner size={14} /> : <DownloadIcon size={15} strokeWidth={2} />}
        {building ? "Preparing…" : "Download Employee List"}
      </button>
      {error ? (
        <p className={styles.exportError} role="alert">
          {error}
        </p>
      ) : null}
    </span>
  );
}
