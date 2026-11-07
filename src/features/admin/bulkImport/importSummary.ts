import type { CommitState } from "./useImportSheet";
import type { SheetRow } from "./importModel";

/** How many rows are ready, need fixing, or still wait for a check. Pure, so it is easy to test. */
export type SheetSummary = { ready: number; needsFixing: number; waiting: number };

export function summarise(rows: SheetRow[]): SheetSummary {
  const summary: SheetSummary = { ready: 0, needsFixing: 0, waiting: 0 };
  for (const row of rows) {
    if (row.check === null) summary.waiting += 1;
    else if (row.check.status === "valid") summary.ready += 1;
    else summary.needsFixing += 1;
  }
  return summary;
}

export function importButtonLabel(ready: number): string {
  return ready === 1 ? "Import 1 customer" : `Import ${ready} customers`;
}

/** Why the import button is off, in plain English. Null means it can be pressed. */
export function submitBlockedReason(input: {
  commit: CommitState["state"];
  checking: boolean;
  summary: SheetSummary;
}): string | null {
  const { commit, checking, summary } = input;
  if (commit === "done")
    return "This sheet is already imported. Start over to import another file.";
  if (commit === "submitting") return "Importing. Wait for the import to finish.";
  if (checking) return "Checking the rows. Wait for the check to finish.";
  if (summary.waiting > 0) {
    return "Some cells changed. Click outside the cell, or press Tab, so every row is checked.";
  }
  if (summary.ready === 0) return "No row is ready yet. Fix the rows that need fixing first.";
  return null;
}
