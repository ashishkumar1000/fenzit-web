import { describe, expect, it } from "bun:test";
import ExcelJS from "exceljs";
import {
  classifyHolidayRows,
  readHolidaySheet,
  type ExistingHolidayRow,
} from "./holidaysBulkSheet";

/**
 * The client-side pre-validation of the bulk sheet (2026-11-26): the same
 * rules the backend runs, proven against REAL xlsx bytes — the templates are
 * built with the BE's own exceljs so the browser reader is pinned to the
 * bytes the download button actually ships. The office checks mirror the
 * tenant's real names; the DB-side checks (existing dates) stay the
 * backend's truth and are not stubbed here.
 */

const OFFICES = [{ name: "Head Office" }, { name: "Test Branch" }];

const DEFAULT_CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>`;

/**
 * A minimal STORE-only zip writer (no compression) — enough for the crafted
 * xlsx edge cases exceljs cannot emit. Local headers + central directory +
 * EOCD, CRC-32 included.
 */
function storeZip(entries: Array<[string, string]>): Uint8Array<ArrayBuffer> {
  const enc = new TextEncoder();
  const crcTable = [...Array(256).keys()].map((n) => {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc32 = (data: Uint8Array): number => {
    let c = 0xffffffff;
    for (const byte of data) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const [name, content] of entries) {
    const nameBytes = enc.encode(name);
    const data = enc.encode(content);
    const crc = crc32(data);
    const local = new Uint8Array(30 + nameBytes.length + data.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true); // version needed
    lv.setUint16(8, 0, true); // stored
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    local.set(data, 30 + nameBytes.length);
    locals.push(local);
    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint32(42, offset, true);
    central.set(nameBytes, 46);
    centrals.push(central);
    offset += local.length;
  }
  const centralSize = centrals.reduce((sum, c) => sum + c.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  const total = offset + centralSize + 22;
  const out = new Uint8Array(total);
  let at = 0;
  for (const chunk of [...locals, ...centrals, eocd]) {
    out.set(chunk, at);
    at += chunk.length;
  }
  return out;
}

/** Fabricates a filled "Holidays" sheet the way the console user's Excel would. */
async function sheetBuffer(
  rows: Array<
    | [string, string | null]
    | [string, string | null, string | null]
    | [string, string | null, string | null, string | null]
  >,
): Promise<File> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Holidays");
  ws.addRow(["Date", "Holiday Name", "Description (optional)", "Offices (optional)"]);
  for (const row of rows) ws.addRow(row);
  const buffer = await wb.xlsx.writeBuffer();
  return new File([buffer], "holidays.xlsx");
}

describe("readHolidaySheet (the browser's pre-validation)", () => {
  it("reads clean rows with the office names resolved as written", async () => {
    const file = await sheetBuffer([
      ["2026-08-15", "Independence Day", null, null],
      ["2026-09-05", "Milad-un-Nabi", "Moon-dependent", "head office"],
      ["2026-10-02", "Gandhi Jayanti", null, "Head Office, Test Branch"],
    ]);
    const { rows, problems } = await readHolidaySheet(file, OFFICES);
    expect(problems).toEqual([]);
    expect(rows.map((r) => [r.date, r.name, r.scope, r.officeNames])).toEqual([
      ["2026-08-15", "Independence Day", "all", []],
      ["2026-09-05", "Milad-un-Nabi", "offices", ["Head Office"]],
      ["2026-10-02", "Gandhi Jayanti", "offices", ["Head Office", "Test Branch"]],
    ]);
  });

  it("catches every shape problem with its sheet row — bad dates, dupes, ceilings", async () => {
    const file = await sheetBuffer([
      ["not a date", "Bad Date", null, null],
      ["2026-02-30", "Impossible Date", null, null],
      ["2026-03-04", null, null, null],
      ["2026-04-03", "N".repeat(81), null, null],
      ["2026-05-01", "Dupe", null, null],
      ["2026-05-01", "Dupe again", null, null],
      ["2026-06-01", "Long", "D".repeat(281), null],
    ]);
    const { rows, problems } = await readHolidaySheet(file, OFFICES);
    // Row 6 is the FIRST 2026-05-01 — it is valid and stays (the dup rule
    // only fails the row that repeats an earlier date).
    expect(rows).toEqual([
      {
        row: 6,
        date: "2026-05-01",
        name: "Dupe",
        description: null,
        scope: "all",
        officeNames: [],
      },
    ]);
    expect(problems.map((p) => [p.row, p.message])).toEqual([
      [2, expect.stringContaining("Use the date as 2026-08-15")],
      [3, expect.stringContaining("Use the date as 2026-08-15")],
      [4, "Give the holiday a name."],
      [5, expect.stringContaining("80 letters")],
      [7, "This date is already on row 6 of this sheet."],
      [8, expect.stringContaining("280 letters")],
    ]);
  });

  it("names an unknown office exactly as the sheet wrote it", async () => {
    const file = await sheetBuffer([["2026-09-05", "Milad-un-Nabi", null, "bengaluru office"]]);
    const { problems } = await readHolidaySheet(file, OFFICES);
    expect(problems).toEqual([
      {
        row: 2,
        date: "2026-09-05",
        name: "Milad-un-Nabi",
        message:
          '"bengaluru office" is not one of your offices — copy the exact name from the Reference sheet.',
      },
    ]);
  });

  it("reads the BE template the download button ships — pre-filled rows parse", async () => {
    // The template the BE generates: pre-filled holidays + the Reference page.
    const wb = new ExcelJS.Workbook();
    const data = wb.addWorksheet("Holidays");
    data.addRow(["Date", "Holiday Name", "Description (optional)", "Offices (optional)"]);
    data.addRow(["2026-01-26", "Republic Day", "National holiday", null]);
    const reference = wb.addWorksheet("Reference");
    reference.getCell("A1").value = "Your offices — copy the exact name:";
    reference.getCell("A3").value = "Head Office";
    const buffer = await wb.xlsx.writeBuffer();
    const { rows, problems } = await readHolidaySheet(new File([buffer], "template.xlsx"), OFFICES);
    expect(problems).toEqual([]);
    expect(rows).toEqual([
      {
        row: 2,
        date: "2026-01-26",
        name: "Republic Day",
        description: "National holiday",
        scope: "all",
        officeNames: [],
      },
    ]);
  });

  it("rejects a file that is not an xlsx at all", async () => {
    const { rows, problems } = await readHolidaySheet(
      new File(["this is not excel"], "broken.xlsx"),
      OFFICES,
    );
    expect(rows).toEqual([]);
    expect(problems).toHaveLength(1);
    // The unpacked-size guard runs FIRST for garbage bytes — its
    // not-a-valid-workbook message is the one shown.
    expect(problems[0].message).toContain("not a valid workbook");
  });

  it("carries the template's generated-on stamp for the stale-sheet warning", async () => {
    const wb = new ExcelJS.Workbook();
    const data = wb.addWorksheet("Holidays");
    data.addRow(["Date", "Holiday Name", "Description (optional)", "Offices (optional)"]);
    data.getCell("F1").value = "Generated on 2026-11-20";
    const buffer = await wb.xlsx.writeBuffer();
    const stamped = await readHolidaySheet(new File([buffer], "t.xlsx"), OFFICES);
    expect(stamped.generatedOn).toBe("2026-11-20");
    // A hand-made sheet has no stamp — the popup stays quiet.
    const unstamped = await sheetBuffer([["2026-08-15", "Independence Day", null, null]]);
    const read = await readHolidaySheet(unstamped, OFFICES);
    expect(read.generatedOn).toBeNull();
  });

  it("reads day-first text dates and bare Excel serials like the backend does", async () => {
    // Serial for 2026-08-15 computed off the Excel epoch (1899-12-30).
    const serial = Math.round((Date.UTC(2026, 7, 15) - Date.UTC(1899, 11, 30)) / 86400000);
    const file = await sheetBuffer([
      ["5/9/2026", "Milad-un-Nabi", null, null],
      [`${serial}`, "Independence Day", null, null],
    ]);
    const { rows, problems } = await readHolidaySheet(file, OFFICES);
    expect(problems).toEqual([]);
    expect(rows.map((r) => r.date)).toEqual(["2026-09-05", "2026-08-15"]);
  });

  it("reports the 500-row cap ONCE, not once per row past it", async () => {
    const rows: Array<[string, string | null]> = [];
    for (let i = 0; i < 502; i += 1) {
      // 336 unique dates per year (28 days × 12 months) across two years —
      // every row must be VALID so it lands in `rows` (only then does the
      // cap trip; dup or bad dates would divert rows into other problems).
      const year = 2027 + Math.floor(i / 336);
      const month = Math.floor((i % 336) / 28) + 1;
      const day = (i % 28) + 1;
      rows.push([
        `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        `Holiday ${i} (${i})`,
      ]);
    }
    const file = await sheetBuffer(rows);
    const { problems } = await readHolidaySheet(file, OFFICES);
    const capProblems = problems.filter((p) => p.message.includes("500"));
    expect(capProblems).toHaveLength(1);
  });

  it("decodes hex character references and survives EMPTY shared strings", async () => {
    // Crafted bytes, not exceljs: Excel writes hex character refs
    // (&#x2026;) and bare <si/> empty entries that exceljs never emits.
    const sharedStrings = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="4" uniqueCount="4">
<si><t>Date</t></si><si><t>Holiday Name</t></si><si><t>&#x2026; with hex ref</t></si><si/>
</sst>`;
    const serial = Math.round((Date.UTC(2026, 7, 15) - Date.UTC(1899, 11, 30)) / 86400000);
    const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetData>
<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>
<row r="2"><c r="A2"><v>${serial}</v></c><c r="B2" t="s"><v>2</v></c></row>
</sheetData>
</worksheet>`;
    const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="Holidays" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;
    const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`;
    const zip = storeZip([
      ["[Content_Types].xml", DEFAULT_CONTENT_TYPES],
      ["xl/workbook.xml", workbook],
      ["xl/_rels/workbook.xml.rels", rels],
      ["xl/sharedStrings.xml", sharedStrings],
      ["xl/worksheets/sheet1.xml", sheet],
    ]);
    const { rows, problems } = await readHolidaySheet(new File([zip], "crafted.xlsx"), OFFICES);
    expect(problems).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("… with hex ref");
    expect(rows[0].date).toBe("2026-08-15");
  });
});

describe("classifyHolidayRows (the popup's New / Changed / already-there split)", () => {
  const officeIdByName = new Map([
    ["head office", "o1"],
    ["test branch", "o2"],
  ]);
  const existing: ExistingHolidayRow[] = [
    {
      date: "2026-10-02",
      name: "Gandhi Jayanti",
      description: null,
      scope: "all",
      officeIds: [],
    },
    {
      date: "2026-08-15",
      name: "Independence Day",
      description: "Flag hoisting",
      scope: "offices",
      officeIds: ["o1"],
    },
  ];

  const row = (
    date: string,
    name: string,
    description: string | null = null,
    scope: "all" | "offices" = "all",
    officeNames: string[] = [],
  ) => ({ row: 2, date, name, description, scope, officeNames });

  it("splits new, changed, and identical rows exactly like the backend lands them", () => {
    const classified = classifyHolidayRows(
      [
        row("2026-12-25", "Christmas"), // new date
        row("2026-10-02", "Mahatma Gandhi Jayanti", "Father of the nation"), // renamed + described
        row("2026-10-02", "gandhi jayanti"), // case-only name difference = identical
        row("2026-08-15", "Independence Day", "Flag hoisting", "offices", ["Head Office"]), // same offices
        row("2026-08-15", "Independence Day", "Flag hoisting", "offices", ["Test Branch"]), // office change
      ],
      [...existing],
      officeIdByName,
    );
    expect(classified.map((r) => [r.name, r.status, r.existingName])).toEqual([
      ["Christmas", "new", undefined],
      ["Mahatma Gandhi Jayanti", "changed", "Gandhi Jayanti"],
      ["gandhi jayanti", "same", undefined],
      ["Independence Day", "same", undefined],
      ["Independence Day", "changed", "Independence Day"],
    ]);
  });
});
