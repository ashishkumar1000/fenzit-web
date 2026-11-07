import { describe, expect, it } from "bun:test";
import writeExcelFile from "write-excel-file/browser";
import { sampleRows } from "./sampleFile";
import { checkXlsxUnpackedSize, XLSX_MAX_ENTRIES } from "./xlsxSizeGuard";
import { SheetError } from "./sheetError";

const MB = 1024 * 1024;
const NAME_BYTES = new TextEncoder().encode("xl/worksheets/sheet1.xml");
const CENTRAL_SIG = 0x02014b50;
const END_SIG = 0x06054b50;

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

/** One central directory header for a stored (uncompressed) entry. CRC is 0; the guard does not read it. */
function centralHeader(size: number): Uint8Array {
  const header = new Uint8Array(46 + NAME_BYTES.length);
  const view = new DataView(header.buffer);
  view.setUint32(0, CENTRAL_SIG, true);
  view.setUint32(20, size, true);
  view.setUint32(24, size, true);
  view.setUint16(28, NAME_BYTES.length, true);
  header.set(NAME_BYTES, 46);
  return header;
}

/** The 22-byte end record, then an optional trailing comment. */
function endRecord(
  entryCount: number,
  directorySize: number,
  directoryOffset: number,
  trailing = new Uint8Array(0),
): Uint8Array {
  const record = new Uint8Array(22);
  const view = new DataView(record.buffer);
  view.setUint32(0, END_SIG, true);
  view.setUint16(8, entryCount, true);
  view.setUint16(10, entryCount, true);
  view.setUint32(12, directorySize, true);
  view.setUint32(16, directoryOffset, true);
  view.setUint16(20, trailing.length, true);
  return concat([record, trailing]);
}

/** A zip whose entries declare the given unpacked sizes. */
function buildZip(sizes: number[]): Uint8Array {
  const directory = concat(sizes.map(centralHeader));
  return concat([directory, endRecord(sizes.length, directory.length, 0)]);
}

/** Offset of the first central header, read back from a zip built by buildZip. */
function directoryStart(zip: Uint8Array): number {
  return new DataView(zip.buffer).getUint32(zip.length - 6, true);
}

function patchUint16(bytes: Uint8Array, at: number, value: number): Uint8Array {
  const copy = bytes.slice();
  new DataView(copy.buffer).setUint16(at, value, true);
  return copy;
}

function patchUint32(bytes: Uint8Array, at: number, value: number): Uint8Array {
  const copy = bytes.slice();
  new DataView(copy.buffer).setUint32(at, value, true);
  return copy;
}

/** Returns what the guard threw, or null when it accepted the file. */
function thrown(bytes: Uint8Array): unknown {
  try {
    checkXlsxUnpackedSize(bytes);
    return null;
  } catch (error) {
    return error;
  }
}

function expectTooLarge(bytes: Uint8Array): void {
  const error = thrown(bytes);
  expect(error).toBeInstanceOf(SheetError);
  expect((error as SheetError).message).toMatch(/too large once unpacked/);
}

function expectMalformed(bytes: Uint8Array): void {
  const error = thrown(bytes);
  expect(error).toBeInstanceOf(SheetError);
  expect((error as SheetError).message).toMatch(/could not read this \.xlsx file/);
}

describe("checkXlsxUnpackedSize: real workbooks", () => {
  it("passes a small workbook built by the sample builder", async () => {
    const blob = await writeExcelFile(sampleRows()).toBlob();
    expect(thrown(new Uint8Array(await blob.arrayBuffer()))).toBeNull();
  });

  it("reads a zip that sits inside a larger buffer, honouring the view offset", () => {
    const small = buildZip([1]);
    const big = buildZip([61 * MB]);
    const padded = new Uint8Array(100 + big.length);
    padded.set(big, 100);
    // The bytes before the view are junk on purpose: a guard that ignores byteOffset would misread them.
    padded.fill(0xff, 0, 100);
    expectTooLarge(padded.subarray(100));

    const packed = new Uint8Array(100 + small.length);
    packed.set(small, 100);
    expect(thrown(packed.subarray(100))).toBeNull();
  });
});

describe("checkXlsxUnpackedSize: unpacked size limits", () => {
  it("refuses a single entry that declares 61 MB", () => {
    expectTooLarge(buildZip([61 * MB]));
  });

  it("refuses a single entry of 31 MB", () => {
    expectTooLarge(buildZip([31 * MB]));
  });

  it("accepts a single entry of exactly 30 MB", () => {
    expect(thrown(buildZip([30 * MB]))).toBeNull();
  });

  it("refuses a single entry one byte over 30 MB", () => {
    expectTooLarge(buildZip([30 * MB + 1]));
  });

  it("accepts a total of exactly 60 MB across entries", () => {
    expect(thrown(buildZip([30 * MB, 30 * MB]))).toBeNull();
  });

  it("refuses a total one byte over 60 MB, even when no single entry is over 30 MB", () => {
    expectTooLarge(buildZip([30 * MB, 30 * MB, 1]));
  });

  it("refuses many small entries that add up past 60 MB", () => {
    const sizes = Array.from({ length: 10 }, () => 6 * MB + 1);
    expectTooLarge(buildZip(sizes));
  });

  it("accepts exactly 2,000 entries", () => {
    expect(thrown(buildZip(new Array(XLSX_MAX_ENTRIES).fill(0)))).toBeNull();
  });

  it("refuses 2,001 entries", () => {
    expectTooLarge(buildZip(new Array(XLSX_MAX_ENTRIES + 1).fill(0)));
  });
});

describe("checkXlsxUnpackedSize: end record and directory", () => {
  it("accepts a valid zip with zero entries", () => {
    expect(thrown(endRecord(0, 0, 0))).toBeNull();
  });

  it("refuses an empty buffer", () => {
    expectMalformed(new Uint8Array(0));
  });

  it("refuses random bytes", () => {
    let seed = 12345;
    const noise = new Uint8Array(4096).map(() => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed & 0xff;
    });
    expectMalformed(noise);
  });

  it("refuses a file that is plain text with a .xlsx name", () => {
    expectMalformed(new TextEncoder().encode("this is not a zip"));
  });

  it("finds the end record when its comment is the longest allowed (65,535 bytes)", () => {
    const record = endRecord(0, 0, 0, new Uint8Array(65535));
    expect(record.length).toBe(65557);
    expect(thrown(record)).toBeNull();
  });

  it("refuses an end record followed by 65,536 bytes, which is just outside the search window", () => {
    expectMalformed(endRecord(0, 0, 0, new Uint8Array(65536)));
  });

  it("refuses a central directory offset beyond the end of the file", () => {
    const zip = buildZip([1]);
    expectMalformed(patchUint32(zip, zip.length - 6, zip.length + 1));
  });

  it("refuses a central directory offset that equals the file length when entries exist", () => {
    const zip = buildZip([1]);
    expectMalformed(patchUint32(zip, zip.length - 6, zip.length));
  });

  it("refuses a zip64 entry count marker rather than guess the real count", () => {
    const zip = buildZip([1]);
    expectMalformed(patchUint16(zip, zip.length - 22 + 10, 0xffff));
  });
});

describe("checkXlsxUnpackedSize: truncated and hostile directories", () => {
  it("refuses a file cut off mid-directory, with the end record kept", () => {
    const zip = buildZip([1, 2, 3]);
    const start = directoryStart(zip);
    const cut = concat([zip.subarray(0, start + 50), zip.subarray(zip.length - 22)]);
    expectMalformed(cut);
  });

  it("refuses a file cut off before its end record", () => {
    const zip = buildZip([1, 2, 3]);
    expectMalformed(zip.subarray(0, zip.length - 10));
  });

  it("refuses a header whose name length runs past the end of the file", () => {
    const zip = buildZip([1]);
    expectMalformed(patchUint16(zip, directoryStart(zip) + 28, 0xffff));
  });

  it("refuses a header with a bad signature", () => {
    const zip = buildZip([1]);
    expectMalformed(patchUint32(zip, directoryStart(zip), 0));
  });

  it("throws SheetError, never RangeError, for every truncated length of a valid zip", () => {
    const zip = buildZip([10, 20, 30]);
    for (let length = 0; length < zip.length; length += 1) {
      const error = thrown(zip.subarray(0, length));
      expect(error).toBeInstanceOf(SheetError);
    }
  });

  it("throws SheetError, never RangeError, when any single byte is overwritten", () => {
    const zip = buildZip([10, 20, 30]);
    for (let at = 0; at < zip.length; at += 1) {
      for (const value of [0x00, 0xff]) {
        const corrupt = zip.slice();
        corrupt[at] = value;
        const error = thrown(corrupt);
        if (error !== null) expect(error).toBeInstanceOf(SheetError);
      }
    }
  });
});
