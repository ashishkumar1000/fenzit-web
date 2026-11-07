import { useRef, useState } from "react";
import { DEFAULT_DIAL_CODE } from "../../../services/countryCodes";
import { messageForError } from "../../../utils/errorMessages";
import {
  commitImportRows,
  geocodeAddress,
  validateImportRows,
  type CommitResponse,
} from "./importApi";
import type { SheetRow } from "./importModel";
import { parseSheetFile, SheetError } from "./parseSheet";

/**
 * State and actions for one staff import on one company. Server calls run from
 * event handlers only, never from an effect. Answers are matched to rows by their
 * position in the sheet (the backend's rowIndex). An answer from an older check is
 * dropped, and it lands only on a row whose cells have not changed since it was sent.
 */

export const READ_FAILED_MESSAGE = "We could not read this file. Check it and try again.";
export const GEOCODE_FAILED_MESSAGE = "Could not look up this address. Try again.";
/** The backend needs at least 3 characters for the address it looks up. */
export const ADDRESS_MIN_LENGTH = 3;

export type LoadedSheet = {
  fileName: string;
  rows: SheetRow[];
};

export type CommitState =
  | { state: "idle" }
  | { state: "submitting" }
  | { state: "error"; message: string }
  | { state: "done"; result: CommitResponse };

function withRow(sheet: LoadedSheet, index: number, change: (row: SheetRow) => SheetRow) {
  return {
    ...sheet,
    rows: sheet.rows.map((row, position) => (position === index ? change(row) : row)),
  };
}

function cellsKey(row: SheetRow): string {
  return JSON.stringify(row.cells);
}

export function useImportSheet(companyId: string | null) {
  const [sheet, setSheet] = useState<LoadedSheet | null>(null);
  const [dialCode, setDialCodeValue] = useState(DEFAULT_DIAL_CODE);
  const [reading, setReading] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [commit, setCommit] = useState<CommitState>({ state: "idle" });
  const checkSeq = useRef(0);
  /** Bumped on every new file or reset, so a late geocode answer for an old file is dropped. */
  const sheetSeq = useRef(0);
  /** The idempotency key for the sheet as it was last submitted (see submit). */
  const submitKey = useRef<{ fingerprint: string; key: string } | null>(null);

  /** Sends every row to the server and applies each answer to the row at the same position. */
  async function runCheck(rows: SheetRow[], code: string): Promise<void> {
    const seq = ++checkSeq.current;
    const sent = rows.map(cellsKey);
    setChecking(true);
    setCheckError(null);
    try {
      const response = await validateImportRows(companyId, code, rows);
      if (seq !== checkSeq.current) return;
      const answers = new Map(response.rows.map((row) => [row.rowIndex, row]));
      setSheet(
        (current) =>
          current && {
            ...current,
            rows: current.rows.map((row, index) => {
              const answer = answers.get(index);
              // A row edited while the check was in flight keeps no answer; its next blur re-checks it.
              if (!answer || sent[index] !== cellsKey(row)) return row;
              return {
                ...row,
                check: { status: answer.status, reasons: answer.reasons, flags: answer.flags },
              };
            }),
          },
      );
      setChecking(false);
    } catch (error) {
      if (seq !== checkSeq.current) return;
      setCheckError(messageForError(error));
      setChecking(false);
    }
  }

  async function loadFile(file: File): Promise<void> {
    checkSeq.current += 1;
    sheetSeq.current += 1;
    submitKey.current = null;
    setReading(true);
    setReadError(null);
    setSheet(null);
    setCheckError(null);
    setChecking(false);
    setCommit({ state: "idle" });
    try {
      const rows = await parseSheetFile(file);
      const loaded: LoadedSheet = { fileName: file.name, rows };
      setSheet(loaded);
      setReading(false);
      await runCheck(rows, dialCode);
    } catch (error) {
      setReading(false);
      setReadError(error instanceof SheetError ? error.message : READ_FAILED_MESSAGE);
    }
  }

  function setDialCode(code: string): void {
    setDialCodeValue(code);
    if (sheet) void runCheck(sheet.rows, code);
  }

  /** A cell edit clears that row's check. Its blur then re-checks the sheet. */
  function editCell(index: number, field: keyof SheetRow["cells"], value: string): void {
    setSheet(
      (current) =>
        current &&
        withRow(current, index, (row) => ({
          ...row,
          cells: { ...row.cells, [field]: value },
          check: null,
        })),
    );
  }

  /** Runs on blur. A check goes out only when some row has changed since the last check. */
  function recheckIfNeeded(): void {
    if (sheet && sheet.rows.some((row) => row.check === null)) {
      void runCheck(sheet.rows, dialCode);
    }
  }

  function retryCheck(): void {
    if (sheet) void runCheck(sheet.rows, dialCode);
  }

  /** Fills latitude and longitude from the row's address parts. A repeat fetch overwrites them. */
  async function fetchLocation(index: number): Promise<void> {
    if (!sheet) return;
    const row = sheet.rows[index];
    if (!row || row.cells.address.trim().length < ADDRESS_MIN_LENGTH) return;
    const sheetAtStart = sheetSeq.current;
    setSheet(
      (current) => current && withRow(current, index, (item) => ({ ...item, geo: "loading" })),
    );
    try {
      const answer = await geocodeAddress(companyId, row.cells);
      // The staff member loaded another file while this was in flight: drop the answer.
      if (sheetAtStart !== sheetSeq.current) return;
      // A null latitude or longitude means no location was found, so the coordinates are cleared.
      const found = answer.latitude !== null && answer.longitude !== null;
      const apply = (item: SheetRow): SheetRow => ({
        ...item,
        cells: {
          ...item.cells,
          latitude: found ? String(answer.latitude) : "",
          longitude: found ? String(answer.longitude) : "",
        },
        geo: found ? "found" : "not-found",
        check: null,
      });
      setSheet((current) => current && withRow(current, index, apply));
      const nextRows = sheet.rows.map((item, position) =>
        position === index ? apply(item) : item,
      );
      await runCheck(nextRows, dialCode);
    } catch {
      if (sheetAtStart !== sheetSeq.current) return;
      setSheet(
        (current) => current && withRow(current, index, (item) => ({ ...item, geo: "error" })),
      );
    }
  }

  /**
   * Sends the whole sheet. The backend fails the invalid rows and saves the rest.
   * A new idempotency key is made for every click (see commitImportRows).
   */
  async function submit(): Promise<void> {
    if (!sheet) return;
    // The same sheet keeps its key, so a retry after a lost answer replays the first one.
    // A changed sheet gets a new key, because the server refuses a reused key with new rows.
    const fingerprint = JSON.stringify({
      rows: sheet.rows.map((row) => row.cells),
      dialCode,
      fileName: sheet.fileName,
    });
    if (submitKey.current?.fingerprint !== fingerprint) {
      submitKey.current = { fingerprint, key: crypto.randomUUID() };
    }
    setCommit({ state: "submitting" });
    try {
      const result = await commitImportRows(
        companyId,
        dialCode,
        sheet.rows,
        sheet.fileName,
        submitKey.current.key,
      );
      setCommit({ state: "done", result });
    } catch (error) {
      setCommit({ state: "error", message: messageForError(error) });
    }
  }

  /** Clears the sheet. The next file starts fresh. */
  function reset(): void {
    checkSeq.current += 1;
    sheetSeq.current += 1;
    submitKey.current = null;
    setSheet(null);
    setReadError(null);
    setCheckError(null);
    setChecking(false);
    setCommit({ state: "idle" });
  }

  return {
    sheet,
    dialCode,
    setDialCode,
    reading,
    readError,
    loadFile,
    checking,
    checkError,
    retryCheck,
    editCell,
    recheckIfNeeded,
    fetchLocation,
    commit,
    submit,
    reset,
  };
}
