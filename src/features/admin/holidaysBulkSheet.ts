/**
 * The bulk sheet's CLIENT-SIDE pre-validation (2026-11-26, owner request):
 * the browser reads the filled .xlsx and runs the SAME checks the backend
 * runs — date shapes, name/description ceilings, duplicate dates, office
 * names — so a broken sheet never costs a round trip and the confirm popup
 * can show exactly what will be added. The backend re-checks everything on
 * confirm; this module only mirrors its rules.
 *
 * The reader is deliberately dependency-free: .xlsx is a ZIP of XML, and the
 * four columns this page needs (shared strings + the first worksheet) read
 * fine with DecompressionStream + targeted extraction. exceljs's Node-isms
 * do not survive Vite's browser graph, and the BE keeps owning GENERATION —
 * this side only reads what the BE (or Excel) wrote.
 */

import { checkXlsxUnpackedSize } from "./bulkImport/xlsxSizeGuard";
import { SheetError } from "./bulkImport/sheetError";

/** A validated sheet row, resolved the way the backend will store it. */
export interface HolidaySheetRow {
  /** 1-based sheet row (row 1 = the header). */
  row: number;
  date: string;
  name: string;
  description: string | null;
  scope: "all" | "offices";
  /** The office names as written in the cell — empty for every office. */
  officeNames: string[];
}

export interface HolidaySheetProblem {
  row: number;
  date: string | null;
  name: string | null;
  message: string;
}

/* --- The confirm popup's classification (mirrors the backend's rule) -------- */

/** An existing calendar holiday, normalized for classification. */
export interface ExistingHolidayRow {
  date: string;
  name: string;
  description: string | null;
  scope: "all" | "offices";
  officeIds: string[];
}

/** A validated sheet row and how the backend will land it: a new holiday,
 *  an override of the stored one, or an untouched pre-filled row. */
export type HolidayRowStatus = "new" | "changed" | "same";

export interface ClassifiedHolidayRow extends HolidaySheetRow {
  status: HolidayRowStatus;
  /** The stored name when the row overrides an existing holiday. */
  existingName?: string;
}

/**
 * The popup's three-way split, decided EXACTLY like the backend decides
 * create/update/skip: a row whose date is new → "new"; a row whose name
 * (case-insensitive), description, or office set differs from the stored
 * holiday → "changed"; otherwise "same". `officeIdByName` maps each tenant
 * office's lowercased name to its id so the sheet's office NAMES compare
 * against the stored ids.
 */
export function classifyHolidayRows(
  rows: HolidaySheetRow[],
  existing: ExistingHolidayRow[],
  officeIdByName: Map<string, string>,
): ClassifiedHolidayRow[] {
  const byDate = new Map(existing.map((h) => [h.date, h] as const));
  return rows.map((row) => {
    const stored = byDate.get(row.date);
    if (stored === undefined) return { ...row, status: "new" as const };
    const sameName = stored.name.toLowerCase() === row.name.toLowerCase();
    const sameDescription = (stored.description ?? "") === (row.description ?? "");
    const rowOfficeIds =
      row.scope === "offices"
        ? row.officeNames
            .map((n) => officeIdByName.get(n.toLowerCase()))
            .filter((id): id is string => id !== undefined)
        : [];
    const sameOffices =
      stored.scope === row.scope &&
      (row.scope === "all" ||
        [...rowOfficeIds].sort().join(",") === [...stored.officeIds].sort().join(","));
    if (sameName && sameDescription && sameOffices) return { ...row, status: "same" as const };
    return { ...row, status: "changed" as const, existingName: stored.name };
  });
}

const NAME_MAX = 80;
const DESCRIPTION_MAX = 280;
const MAX_ROWS = 500;

export async function readHolidaySheet(
  file: File,
  offices: { name: string }[],
): Promise<{
  rows: HolidaySheetRow[];
  problems: HolidaySheetProblem[];
  generatedOn: string | null;
}> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  // Unpacked-size ceiling BEFORE inflating anything (the bulk-import
  // sibling's guard): a tiny zip can declare gigabytes inside.
  try {
    checkXlsxUnpackedSize(bytes);
  } catch (error) {
    return {
      rows: [],
      problems: [
        {
          row: 0,
          date: null,
          name: null,
          message:
            error instanceof SheetError
              ? error.message
              : "This file could not be read as an Excel (.xlsx) sheet. Download the template and fill it.",
        },
      ],
      generatedOn: null,
    };
  }
  let cells: string[][];
  try {
    cells = await readFirstSheet(bytes.buffer);
  } catch {
    return {
      rows: [],
      problems: [
        {
          row: 0,
          date: null,
          name: null,
          message:
            "This file could not be read as an Excel (.xlsx) sheet. Download the template and fill it.",
        },
      ],
      generatedOn: null,
    };
  }

  const officeNameByKey = new Map(offices.map((o) => [o.name.toLowerCase(), o.name] as const));
  const rows: HolidaySheetRow[] = [];
  const problems: HolidaySheetProblem[] = [];
  const seenDates = new Map<string, number>();
  let capReported = false;

  cells.forEach((rowCells, index) => {
    const rowNumber = index + 1;
    if (rowNumber === 1) return; // the header
    const [dateCell, nameCell, descriptionCell, officesCell] = [
      rowCells[0] ?? null,
      rowCells[1] ?? null,
      rowCells[2] ?? null,
      rowCells[3] ?? null,
    ];

    const name = trimmedOrNull(nameCell);
    const description = trimmedOrNull(descriptionCell);
    const officesRaw = trimmedOrNull(officesCell);
    if ((dateCell === null || dateCell === "") && name === null && officesRaw === null) {
      return; // blank filler row
    }

    const problem = (message: string): HolidaySheetProblem => ({
      row: rowNumber,
      date: isRealDateText(dateCell) ? dateCell : null,
      name,
      message,
    });

    if (rows.length >= MAX_ROWS) {
      // One cap message for the sheet, not one per row past the cap — a
      // 600-row sheet would otherwise render a hundred identical errors.
      if (!capReported) {
        problems.push(
          problem(
            `The sheet holds more than ${MAX_ROWS} holidays — upload the rest in a second sheet.`,
          ),
        );
        capReported = true;
      }
      return;
    }

    const date = readDateText(dateCell);
    if (date === null) {
      problems.push(
        problem("Use the date as 2026-08-15 (or let Excel format the cell as a date)."),
      );
      return;
    }
    if (name === null) {
      problems.push({ row: rowNumber, date, name: null, message: "Give the holiday a name." });
      return;
    }
    if (name.length > NAME_MAX) {
      problems.push({
        row: rowNumber,
        date,
        name,
        message: `The name is over ${NAME_MAX} letters — shorten it.`,
      });
      return;
    }
    if (description !== null && description.length > DESCRIPTION_MAX) {
      problems.push({
        row: rowNumber,
        date,
        name,
        message: `The description is over ${DESCRIPTION_MAX} letters — shorten it.`,
      });
      return;
    }
    const earlierRow = seenDates.get(date);
    if (earlierRow !== undefined) {
      problems.push({
        row: rowNumber,
        date,
        name,
        message: `This date is already on row ${earlierRow} of this sheet.`,
      });
      return;
    }

    // The Offices cell: blank/"all" covers every office; named offices must
    // match the tenant's real names case-insensitively — the problem echoes
    // the name as written, the row keeps the resolved ones for the popup.
    let scope: HolidaySheetRow["scope"] = "all";
    let resolvedOffices: string[] = [];
    if (officesRaw !== null && !/^all( offices)?$/i.test(officesRaw)) {
      const wanted = [
        ...new Map(
          officesRaw
            .split(/[,;]/)
            .map((part) => part.trim())
            .filter((part) => part !== "")
            .map((part) => [part.toLowerCase(), part] as const),
        ).entries(),
      ];
      const resolved: string[] = [];
      for (const [lookupKey, asWritten] of wanted) {
        const matched = officeNameByKey.get(lookupKey);
        if (matched === undefined) {
          problems.push(
            problem(
              `"${asWritten}" is not one of your offices — copy the exact name from the Reference sheet.`,
            ),
          );
        } else {
          resolved.push(matched);
        }
      }
      if (resolved.length === 0) {
        if (problems.at(-1)?.row !== rowNumber) {
          problems.push({
            row: rowNumber,
            date,
            name,
            message: "Name at least one office, or leave the cell blank for every office.",
          });
        }
        return;
      }
      scope = "offices";
      resolvedOffices = resolved;
    }

    seenDates.set(date, rowNumber);
    rows.push({ row: rowNumber, date, name, description, scope, officeNames: resolvedOffices });
  });

  return { rows, problems, generatedOn: extractGeneratedOn(cells[0] ?? []) };
}

/**
 * The template's freshness stamp ("Generated on YYYY-MM-DD") sits in row 1
 * out of the data columns (F1) — the popup warns when the sheet predates
 * unknown calendar changes. Hand-made sheets have no stamp: null, no warning.
 */
function extractGeneratedOn(headerRow: string[]): string | null {
  for (const cell of headerRow.slice(4)) {
    // The grid is index-assigned, so skipped columns leave real holes.
    if (cell === undefined) continue;
    const match = /^Generated on (\d{4}-\d{2}-\d{2})$/.exec(cell.trim());
    if (match !== null) return match[1];
  }
  return null;
}

/* --- The minimal xlsx reader ----------------------------------------------- */

/**
 * The first worksheet as a grid of raw cell texts, row 1 = the header row.
 * Rows may be sparse; `grid[i][j]` is column j+1 of row i+1 (null/"" when the
 * cell is empty or absent).
 */
async function readFirstSheet(buffer: ArrayBuffer): Promise<string[][]> {
  const entries = await unzip(buffer);
  const shared = readSharedStrings(entries.get("xl/sharedStrings.xml"));
  // The first sheet in WORKBOOK order, not the lowest part number — Excel
  // keeps part names stable when tabs are reordered, so "sheet1.xml" can be
  // second in the tab strip. workbook.xml lists the sheets in order; its
  // r:id resolves to the part through the rels file.
  const sheetName =
    firstSheetPartByWorkbookOrder(entries) ??
    [...entries.keys()]
      .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))
      .sort((a, b) => {
        const num = (s: string) => Number(/sheet(\d+)\.xml$/.exec(s)?.[1] ?? 0);
        return num(a) - num(b);
      })[0] ??
    null;
  if (sheetName === null) throw new Error("no worksheet");
  const xml = decodeUtf8(entries.get(sheetName));

  const grid: string[][] = [];
  for (const rowMatch of xml.matchAll(/<row[^>]*?>([\s\S]*?)<\/row>|<row[^>]*?\/>/g)) {
    const inner = rowMatch[1] ?? ""; // self-closing empty rows
    const rowAttr = /<row[^>]*?\br="(\d+)"/.exec(rowMatch[0]);
    const rowNumber = rowAttr !== null ? Number(rowAttr[1]) : grid.length + 1;
    const rowCells: string[] = [];
    for (const cellMatch of inner.matchAll(/<c\s([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cellMatch[1];
      const cellInner = cellMatch[2] ?? "";
      const ref = /\br="([A-Z]+)\d+"/.exec(attrs);
      const col = ref !== null ? columnToIndex(ref[1]) : rowCells.length + 1;
      const value = readCellText(attrs, cellInner, shared);
      rowCells[col - 1] = value;
    }
    grid[rowNumber - 1] = rowCells;
  }
  return grid;
}

/**
 * The part name of the FIRST sheet in workbook order (workbook.xml → rels →
 * target), or null when either file is missing so the caller can fall back
 * to the lowest-numbered part.
 */
function firstSheetPartByWorkbookOrder(entries: Map<string, Uint8Array>): string | null {
  const workbook = entries.get("xl/workbook.xml");
  const rels = entries.get("xl/_rels/workbook.xml.rels");
  if (workbook === undefined || rels === undefined) return null;
  const sheetEntry = /<sheet[^>]*>/i.exec(decodeUtf8(workbook));
  if (sheetEntry === null) return null;
  const rid = /\br:id="([^"]+)"/i.exec(sheetEntry[0])?.[1];
  if (rid === undefined) return null;
  const relsText = decodeUtf8(rels);
  for (const rel of relsText.matchAll(/<Relationship[^>]*>/g)) {
    if (!/\br?:id="[^"]*"/.test(rel[0])) continue;
    const relId = /\br?:id="([^"]*)"/i.exec(rel[0])?.[1];
    if (relId !== rid) continue;
    const target = /\bTarget="([^"]*)"/i.exec(rel[0])?.[1];
    if (target === undefined) return null;
    // Targets are relative to xl/ ("worksheets/sheet1.xml").
    const part = `xl/${target.replace(/^\//, "").replace(/^\.\.\//, "")}`;
    return entries.has(part) ? part : null;
  }
  return null;
}

/** Shared strings: every <si> is one entry; rich text <r><t> parts concatenate.
 *  Excel writes a bare `<si/>` for an EMPTY shared string — group 1 is then
 *  undefined, and reading matchAll off it would reject the whole sheet. */
function readSharedStrings(xml: Uint8Array | undefined): string[] {
  if (xml === undefined) return [];
  const text = decodeUtf8(xml);
  return [...text.matchAll(/<si[^>]*>([\s\S]*?)<\/si>|<si\/>/g)].map((si) => {
    const inner = si[1] ?? "";
    const parts = [...inner.matchAll(/<t[^>]*>([\s\S]*?)<\/t>|<t\/>/g)].map((t) => t[1]);
    return xmlDecode(parts.length > 0 ? parts.join("") : inner);
  });
}

/** One <c> → its text: shared string, inline string, formula result or number. */
function readCellText(attrs: string, inner: string, shared: string[]): string {
  const v = /<v[^>]*>([\s\S]*?)<\/v>/.exec(inner)?.[1] ?? null;
  if (/\bt="s"/.test(attrs) && v !== null) {
    return shared[Number(v)] ?? "";
  }
  if (/\bt="inlineStr"/.test(attrs)) {
    const parts = [...inner.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]);
    return xmlDecode(parts.join(""));
  }
  if (v === null) return "";
  return xmlDecode(v);
}

function columnToIndex(letters: string): number {
  let index = 0;
  for (const letter of letters) {
    index = index * 26 + (letter.charCodeAt(0) - 64);
  }
  return index;
}

function decodeUtf8(bytes: Uint8Array | undefined): string {
  if (bytes === undefined) return "";
  return new TextDecoder().decode(bytes);
}

function xmlDecode(text: string): string {
  return (
    text
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      // Decimal AND hex character references — Excel emits hex (&#x2026;).
      .replace(/&#x([0-9a-fA-F]+);/g, (_, code: string) =>
        String.fromCodePoint(Number.parseInt(code, 16)),
      )
      .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
      .replace(/&amp;/g, "&")
  );
}

/** Trims raw cell text to null, matching the backend's cellText. */
function trimmedOrNull(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/* --- ZIP (the .xlsx container) ---------------------------------------------- */

/** Every file in the archive: name → bytes. Deflate via DecompressionStream,
 *  stored entries pass through; the EOCD scan is the standard last-64KB walk. */
async function unzip(buffer: ArrayBuffer): Promise<Map<string, Uint8Array>> {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65558); i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("not a zip");
  const count = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);

  const entries = new Map<string, Uint8Array>();
  for (let i = 0; i < count; i += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) break;
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLen = view.getUint16(offset + 28, true);
    const extraLen = view.getUint16(offset + 30, true);
    const commentLen = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decodeUtf8(bytes.subarray(offset + 46, offset + 46 + nameLen));

    const localNameLen = view.getUint16(localOffset + 26, true);
    const localExtraLen = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLen + localExtraLen;
    const data = bytes.subarray(dataStart, dataStart + compressedSize);
    if (method === 0) {
      entries.set(name, data);
    } else if (method === 8) {
      entries.set(name, new Uint8Array(await inflateRaw(data)));
    }
    offset += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

async function inflateRaw(data: Uint8Array): Promise<ArrayBuffer> {
  // The unzip walk hands back subarrays of one big buffer — typed
  // ArrayBufferLike, which BlobPart's ArrayBufferView<ArrayBuffer> rejects
  // even though the backing buffer is a plain ArrayBuffer here.
  const stream = new Blob([data as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  return new Response(stream).arrayBuffer();
}

/* --- The date rules (ported one-for-one from the backend) -------------------- */

/** A date cell → YYYY-MM-DD, or null when it is not a real date. Accepts ISO
 *  text, day-first text (India writes d/m/y), and bare Excel serials — real
 *  date cells surface here as their serial number in text form. */
function readDateText(text: string | null | undefined): string | null {
  if (text === null || text === undefined) return null;
  const trimmed = text.trim();
  if (trimmed === "") return null;

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
  if (iso !== null) {
    return normalizeParts(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }
  const dmy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/.exec(trimmed);
  if (dmy !== null) {
    const yearRaw = Number(dmy[3]);
    const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
    return normalizeParts(year, Number(dmy[2]), Number(dmy[1]));
  }
  // A bare Excel date serial — bounded to 1950–2099 (serials 18264–73050).
  const serial = /^\d{4,6}(\.\d+)?$/.test(trimmed) ? Number(trimmed) : null;
  if (serial !== null && serial >= 18264 && serial <= 73050) {
    const [year, month, day] = serialToParts(serial);
    return normalizeParts(year, month, day);
  }
  return null;
}

/** Whether the text already reads as an ISO date (for the error table's echo). */
function isRealDateText(text: string | null | undefined): boolean {
  return text !== null && text !== undefined && /^\d{4}-\d{2}-\d{2}$/.test(text);
}

function serialToParts(serial: number): [number, number, number] {
  const ms = Math.round((serial - 25569) * 86400000);
  const probe = new Date(ms);
  return [probe.getUTCFullYear(), probe.getUTCMonth() + 1, probe.getUTCDate()];
}

/** YYYY-MM-DD only when the parts name a REAL calendar date (no rollover). */
function normalizeParts(year: number, month: number, day: number): string | null {
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${String(year).padStart(4, "0")}-${pad(month)}-${pad(day)}`;
}
