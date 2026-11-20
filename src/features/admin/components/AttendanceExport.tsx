import { useState } from "react";
import type { MonthlyEmployeeRow } from "../companyApi";
import { Spinner } from "../../../components/ui/Spinner";
import { DownloadIcon } from "../../../components/ui/consoleIcons";
import styles from "./AttendanceExport.module.css";

/** A typed-in cell that starts with = + - or @ would run as a formula in a
 *  spreadsheet, so a leading apostrophe makes it plain text. Applied to the
 *  free-text cells only: numbers never start with those. */
function guardFormula(text: string): string {
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

/** Builds attendance.csv in one shot — the monthly endpoint already returns
 *  the whole roster (bounded by headcount), so there is nothing to walk and
 *  no progress to report. */
async function downloadAttendanceCsv(rows: MonthlyEmployeeRow[]): Promise<void> {
  const quote = (cell: string): string => `"${cell.replace(/"/g, '""')}"`;
  const header = [
    "Employee",
    "Office",
    "Worked",
    "Half days",
    "Late",
    "Leave",
    "Weekly offs",
    "Holidays",
    "Worked on holidays",
    "Absent",
    "Missing check-outs",
  ].join(",");
  const lines = rows.map((e) =>
    [
      quote(guardFormula(e.employeeName)),
      quote(guardFormula(e.officeName ?? "")),
      String(e.summary.daysWorked),
      String(e.summary.halfDays),
      String(e.summary.lateCount),
      String(e.summary.leave),
      String(e.summary.weeklyOffs),
      String(e.summary.holidays),
      String(e.summary.workedOnHoliday),
      String(e.summary.absent),
      String(e.summary.checkoutMissing),
    ].join(","),
  );
  // The byte-order mark makes Excel read the file as UTF-8, so accented
  // names do not garble.
  const blob = new Blob(["﻿" + [header, ...lines].join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "attendance.csv";
  // Some browsers (Safari) cancel a download whose link is not in the page,
  // or whose URL is revoked in the same tick as the click.
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** The month table's export: the whole roster's tallies as they were loaded —
 *  the chips, office filter and sort on screen do not trim the file (the
 *  filter state lives in the address, the book lives in the payload). */
export function ExportAttendanceButton({ rows }: { rows: MonthlyEmployeeRow[] }) {
  const [error, setError] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  return (
    <span className={styles.exportWrap}>
      <button
        type="button"
        className={styles.secondaryButton}
        disabled={building || rows.length === 0}
        onClick={() => {
          setError(null);
          setBuilding(true);
          Promise.resolve(downloadAttendanceCsv(rows))
            .catch(() => setError("The file could not be created. Try again."))
            .finally(() => setBuilding(false));
        }}
      >
        {building ? <Spinner size={14} /> : <DownloadIcon size={15} strokeWidth={2} />}
        {building ? "Preparing…" : "Export CSV"}
      </button>
      {error ? (
        <p className={styles.exportError} role="alert">
          {error}
        </p>
      ) : null}
    </span>
  );
}
