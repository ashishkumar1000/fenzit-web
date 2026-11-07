import { describe, expect, it } from "bun:test";
import type { SheetRow } from "./importModel";
import { importButtonLabel, submitBlockedReason, summarise } from "./importSummary";

function row(check: SheetRow["check"]): SheetRow {
  return {
    rowNumber: 2,
    cells: {
      name: "",
      address: "",
      phone: "",
      latitude: "",
      longitude: "",
      city: "",
      state: "",
      pincode: "",
      addressDetails: "",
    },
    check,
    geo: "idle",
  };
}

const VALID = { status: "valid" as const, reasons: [], flags: [] };
const INVALID = {
  status: "invalid" as const,
  reasons: [{ field: "phone", code: "PHONE", message: "Phone is not valid." }],
  flags: [],
};
const READY = { ready: 1, needsFixing: 0, waiting: 0 };

describe("summarise: row counts", () => {
  it("counts zero rows as all zero", () => {
    expect(summarise([])).toEqual({ ready: 0, needsFixing: 0, waiting: 0 });
  });

  it("counts a single unchecked row as waiting", () => {
    expect(summarise([row(null)])).toEqual({ ready: 0, needsFixing: 0, waiting: 1 });
  });

  it("separates valid, invalid and unchecked rows", () => {
    expect(summarise([row(VALID), row(INVALID), row(null), row(VALID)])).toEqual({
      ready: 2,
      needsFixing: 1,
      waiting: 1,
    });
  });

  it("counts 500 valid rows without losing any", () => {
    const rows = Array.from({ length: 500 }, () => row(VALID));
    expect(summarise(rows).ready).toBe(500);
  });
});

describe("importButtonLabel", () => {
  it("uses the singular for exactly one customer", () => {
    expect(importButtonLabel(1)).toBe("Import 1 customer");
  });

  it("uses the plural for zero and for many", () => {
    expect(importButtonLabel(0)).toBe("Import 0 customers");
    expect(importButtonLabel(2)).toBe("Import 2 customers");
    expect(importButtonLabel(500)).toBe("Import 500 customers");
  });
});

describe("submitBlockedReason: when the import button is off", () => {
  it("is off with a reason when no row is ready", () => {
    const reason = submitBlockedReason({
      commit: "idle",
      checking: false,
      summary: { ready: 0, needsFixing: 2, waiting: 0 },
    });
    expect(reason).toBe("No row is ready yet. Fix the rows that need fixing first.");
  });

  it("is on when at least one row is ready and none is waiting", () => {
    expect(submitBlockedReason({ commit: "idle", checking: false, summary: READY })).toBeNull();
  });

  it("is off while the sheet is being checked, even if rows are ready", () => {
    expect(submitBlockedReason({ commit: "idle", checking: true, summary: READY })).toBe(
      "Checking the rows. Wait for the check to finish.",
    );
  });

  it("is off when a cell changed and its row has not been checked yet", () => {
    const reason = submitBlockedReason({
      commit: "idle",
      checking: false,
      summary: { ready: 1, needsFixing: 0, waiting: 1 },
    });
    expect(reason).toContain("Click outside the cell, or press Tab");
  });

  it("is off during a submit, and after an import has finished", () => {
    expect(submitBlockedReason({ commit: "submitting", checking: false, summary: READY })).toBe(
      "Importing. Wait for the import to finish.",
    );
    expect(submitBlockedReason({ commit: "done", checking: false, summary: READY })).toBe(
      "This sheet is already imported. Start over to import another file.",
    );
  });

  it("gives the earliest reason when several apply: done beats checking beats waiting", () => {
    const waiting = { ready: 1, needsFixing: 0, waiting: 1 };
    expect(submitBlockedReason({ commit: "done", checking: true, summary: waiting })).toContain(
      "already imported",
    );
    expect(submitBlockedReason({ commit: "idle", checking: true, summary: waiting })).toContain(
      "Checking the rows",
    );
  });
});
