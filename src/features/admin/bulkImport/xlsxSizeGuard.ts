import { SheetError } from "./sheetError";

/**
 * Zip-bomb guard for .xlsx files. An .xlsx is a zip. Each entry in the zip's
 * central directory declares its unpacked size, so we add those up from the
 * directory alone and refuse the file before the spreadsheet reader unpacks it.
 * Nothing is decompressed here. Every read is bounds-checked.
 */

const MB = 1024 * 1024;
export const XLSX_MAX_TOTAL_UNPACKED_BYTES = 60 * MB;
export const XLSX_MAX_ENTRY_UNPACKED_BYTES = 30 * MB;
export const XLSX_MAX_ENTRIES = 2000;

const END_RECORD_SIGNATURE = 0x06054b50;
const CENTRAL_HEADER_SIGNATURE = 0x02014b50;
const END_RECORD_SIZE = 22;
// The end record can be followed by a comment of up to 65,535 bytes.
const END_RECORD_SEARCH_WINDOW = END_RECORD_SIZE + 0xffff;
const CENTRAL_HEADER_FIXED_SIZE = 46;
const ZIP64_MARKER_16 = 0xffff;
const ZIP64_MARKER_32 = 0xffffffff;

const TOO_LARGE_MESSAGE =
  "This .xlsx file is too large once unpacked. Save a smaller sheet and try again.";
const MALFORMED_MESSAGE =
  "We could not read this .xlsx file. It is not a valid workbook. Save it again from Excel and retry.";

/** Finds the last end-of-central-directory record in the final 65,557 bytes, or throws. */
function findEndRecord(view: DataView): number {
  const lowest = Math.max(0, view.byteLength - END_RECORD_SEARCH_WINDOW);
  for (let at = view.byteLength - END_RECORD_SIZE; at >= lowest; at -= 1) {
    if (view.getUint32(at, true) === END_RECORD_SIGNATURE) return at;
  }
  throw new SheetError(MALFORMED_MESSAGE);
}

/** Throws the malformed-file error unless `length` bytes starting at `at` are inside the file. */
function requireBytes(view: DataView, at: number, length: number): void {
  if (at + length > view.byteLength) throw new SheetError(MALFORMED_MESSAGE);
}

/**
 * Adds up the unpacked sizes the zip's central directory declares.
 * Throws SheetError when the total is over 60 MB, one entry is over 30 MB,
 * or there are more than 2,000 entries. Throws SheetError for any file that
 * is not a readable zip (empty, random, truncated, or with bad offsets).
 */
export function checkXlsxUnpackedSize(bytes: Uint8Array): void {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const end = findEndRecord(view);
  requireBytes(view, end, END_RECORD_SIZE);
  const entryCount = view.getUint16(end + 10, true);
  const directoryOffset = view.getUint32(end + 16, true);
  // Zip64 archives store their real counts elsewhere, which this guard does not read. Refuse them.
  if (entryCount === ZIP64_MARKER_16 || directoryOffset === ZIP64_MARKER_32) {
    throw new SheetError(MALFORMED_MESSAGE);
  }
  if (entryCount > XLSX_MAX_ENTRIES) throw new SheetError(TOO_LARGE_MESSAGE);
  if (directoryOffset > view.byteLength) throw new SheetError(MALFORMED_MESSAGE);

  let total = 0;
  let at = directoryOffset;
  for (let index = 0; index < entryCount; index += 1) {
    requireBytes(view, at, CENTRAL_HEADER_FIXED_SIZE);
    if (view.getUint32(at, true) !== CENTRAL_HEADER_SIGNATURE) {
      throw new SheetError(MALFORMED_MESSAGE);
    }
    const unpackedSize = view.getUint32(at + 24, true);
    const nameLength = view.getUint16(at + 28, true);
    const extraLength = view.getUint16(at + 30, true);
    const commentLength = view.getUint16(at + 32, true);
    const headerLength = CENTRAL_HEADER_FIXED_SIZE + nameLength + extraLength + commentLength;
    requireBytes(view, at, headerLength);

    if (unpackedSize > XLSX_MAX_ENTRY_UNPACKED_BYTES) throw new SheetError(TOO_LARGE_MESSAGE);
    total += unpackedSize;
    if (total > XLSX_MAX_TOTAL_UNPACKED_BYTES) throw new SheetError(TOO_LARGE_MESSAGE);
    at += headerLength;
  }
}
