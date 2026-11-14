import { useState } from "react";
import { readSession } from "../../services/session";
import {
  fetchReportStatus,
  requestReport,
  retryReport,
  type ReportHistoryRow,
  type ReportTypeChoice,
  type RosterPerson,
} from "./jobExportApi";
import { ReportHistoryList } from "./ReportHistoryList";
import { Dropdown } from "./components/Dropdown";
import { messageForError } from "../../utils/errorMessages";
import { istShifted, istToday } from "./format";
import type { Slice } from "./slice";
import styles from "./ReportExportCard.module.css";

type ExportState =
  | { kind: "idle" }
  | { kind: "working" }
  | { kind: "ready"; url: string }
  | { kind: "error"; message: string };

/** How long the generation may take: 20 polls, 2 s apart. A PDF for a
 *  month of jobs lands well inside that; beyond it the user is told to try
 *  again rather than left waiting. */
const MAX_POLLS = 20;
const POLL_MS = 2000;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Saves the PDF to the device: fetch the file and hand it to the browser's
 *  download, falling back to opening the link when the storage origin
 *  refuses a cross-origin read (CORS) — the file still lands in a tab. */
async function downloadLocally(url: string, filename: string): Promise<void> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`file ${res.status}`);
    const blob = await res.blob();
    const anchor = document.createElement("a");
    const objectUrl = URL.createObjectURL(blob);
    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch {
    window.open(url, "_blank", "noopener");
  }
}

const DEFAULT_FILENAME = "fenzit-report.pdf";

/** One report card: pick the date window (and, for the job report, the
 *  employee) and generate; anything already generated sits in the history
 *  below to re-download, newest first. The page picks the report type —
 *  the Jobs tab carries the job report, the Attendance tab the attendance
 *  one — so each card speaks only its own type. */
export function ReportExportCard({
  reportType,
  history,
  employees,
  onRetryHistory,
}: {
  reportType: ReportTypeChoice;
  history: Slice<ReportHistoryRow[]>;
  /** The active roster for the employee dropdown; absent on the attendance
   *  card (that report scopes by office, and all offices is the default). */
  employees?: Slice<RosterPerson[]>;
  onRetryHistory: () => void;
}) {
  const [startDate, setStartDate] = useState(() => istShifted(-29));
  const [endDate, setEndDate] = useState(() => istToday());
  /** "" = every employee; otherwise one employee's id (the dropdown). */
  const [employeeId, setEmployeeId] = useState("");
  const [state, setState] = useState<ExportState>({ kind: "idle" });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyKind, setBusyKind] = useState<"download" | "retry" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // The backend's own limit, checked before a wasted round trip.
  const datesInverted = startDate > endDate;
  // A cleared date input must not reach the wire as an empty string.
  const datesMissing = startDate === "" || endDate === "";

  /** Polls one request id to its terminal state — shared by a fresh generate
   *  and a retry of a failed row, so both speak the same statuses. */
  const awaitReady = async (
    id: string,
  ): Promise<{ ok: true; url: string; filename: string } | { ok: false; slow: boolean }> => {
    for (let attempt = 0; attempt < MAX_POLLS; attempt += 1) {
      await wait(POLL_MS);
      let status;
      try {
        status = await fetchReportStatus(id);
      } catch {
        // One failed poll is a network blip, not a failed report — keep
        // polling; a report that never finishes still hits the attempt cap.
        continue;
      }
      // The wire status is the DB's: queued → generating → ready|failed.
      if (status.status === "ready" && status.file?.url) {
        return {
          ok: true,
          url: status.file.url,
          filename: status.file.filename ?? DEFAULT_FILENAME,
        };
      }
      if (status.status === "failed") {
        return { ok: false, slow: false };
      }
    }
    return { ok: false, slow: true };
  };

  const generate = async (): Promise<void> => {
    setState({ kind: "working" });
    setActionError(null);
    try {
      const id = await requestReport(reportType, {
        startDate,
        endDate,
        technicianIds: employeeId === "" ? [] : [employeeId],
      });
      const file = await awaitReady(id);
      if (!file.ok) {
        setState({
          kind: "error",
          message: file.slow
            ? "The report is taking unusually long. Try again in a minute."
            : "The report could not be built. Try again.",
        });
        return;
      }
      await downloadLocally(file.url, file.filename);
      setState({ kind: "ready", url: file.url });
      onRetryHistory();
    } catch (error) {
      // A dead session, a refused window, a network drop — each speaks for
      // itself, instead of every failure reading as a build problem.
      setState({ kind: "error", message: messageForError(error) });
    }
  };

  const download = async (row: ReportHistoryRow): Promise<void> => {
    setBusyId(row.id);
    setBusyKind("download");
    setActionError(null);
    try {
      const status = await fetchReportStatus(row.id);
      if (status.status === "ready" && status.file?.url) {
        await downloadLocally(status.file.url, status.file.filename ?? DEFAULT_FILENAME);
      } else {
        setActionError("That report is not ready to download. Generate a new one.");
      }
    } catch (error) {
      setActionError(messageForError(error));
    } finally {
      setBusyId(null);
      setBusyKind(null);
    }
  };

  /** A failed row regenerates in place (the same history row), then its own
   *  download runs — the row flips to ready without leaving the list. */
  const retry = async (row: ReportHistoryRow): Promise<void> => {
    setBusyId(row.id);
    setBusyKind("retry");
    setActionError(null);
    try {
      await retryReport(readSession()?.token ?? "", row.id);
      // The backend re-queued the row the moment the retry was accepted —
      // refresh now, so the row stops reading "failed" while it builds.
      onRetryHistory();
      const file = await awaitReady(row.id);
      if (!file.ok) {
        setActionError(
          file.slow
            ? "Still building — give it a minute, then try downloading."
            : "The report could not be built. Try again.",
        );
      } else {
        await downloadLocally(file.url, file.filename);
        onRetryHistory();
      }
    } catch (error) {
      setActionError(messageForError(error));
    } finally {
      setBusyId(null);
      setBusyKind(null);
    }
  };

  const jobReport = reportType === "technician_job_activity";

  return (
    <div>
      <div className={styles.pickers}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>From</span>
          <input
            type="date"
            className={styles.control}
            value={startDate}
            max={endDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>To</span>
          <input
            type="date"
            className={styles.control}
            value={endDate}
            min={startDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </label>
        {jobReport ? (
          employees?.ok ? (
            <Dropdown
              label="Employee"
              value={employeeId}
              onChange={setEmployeeId}
              options={[
                { value: "", label: "All employees" },
                ...employees.data.map((person) => ({
                  value: person.id,
                  label: person.name,
                  meta: [person.phone, person.employeeCode]
                    .filter((part) => part !== "")
                    .join(" · "),
                })),
              ]}
            />
          ) : (
            // A vanished control reads as "narrowing is gone forever" — say
            // what the report does instead, and that it still generates.
            <p className={styles.alert} role="alert">
              The employee list could not load — the report will cover all employees.{" "}
              <button type="button" className={styles.retry} onClick={onRetryHistory}>
                Try again
              </button>
            </p>
          )
        ) : null}
        {state.kind !== "working" ? (
          <button
            type="button"
            className={styles.button}
            onClick={() => void generate()}
            disabled={datesInverted || datesMissing}
          >
            Download report
          </button>
        ) : null}
      </div>
      {datesInverted ? (
        <p className={styles.alert} role="alert">
          The start date must be on or before the end date.
        </p>
      ) : null}
      {datesMissing ? (
        <p className={styles.alert} role="alert">
          Pick both dates to generate the report.
        </p>
      ) : null}

      {state.kind === "working" ? (
        <p className={styles.line} role="status">
          Building the report — this takes a few seconds…
        </p>
      ) : null}
      {state.kind === "ready" ? (
        <p className={styles.line} role="status">
          Report downloaded.{" "}
          <a className={styles.link} href={state.url} target="_blank" rel="noreferrer">
            Open it again
          </a>
        </p>
      ) : null}
      {state.kind === "error" ? (
        <p className={styles.alert} role="alert">
          {state.message}
        </p>
      ) : null}
      {state.kind === "idle" ? (
        <p className={styles.hint}>
          {jobReport
            ? "A PDF of the chosen employees' job work over the chosen dates."
            : "A PDF of attendance for all offices over the chosen dates."}
        </p>
      ) : null}

      <ReportHistoryList
        history={history}
        reportType={reportType}
        busyId={busyId}
        busyKind={busyKind}
        error={actionError}
        onDownload={(row) => void download(row)}
        onRetry={(row) => void retry(row)}
        onRetryHistory={onRetryHistory}
      />
    </div>
  );
}
