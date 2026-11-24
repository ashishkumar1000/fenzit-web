import type { LeaveRow } from "./companyApi";

/**
 * The leave-type display helpers every Leave surface shares — the day
 * modal's pills, the calendar tab's filter bar and breakdown card. All of
 * them read only the list row's optional type fields, so a legacy row
 * (created before the fixed catalog) simply contributes no type anywhere.
 */

/** The catalog's stable display order — the Types tab's order, so the day
 *  modal's count chips, the calendar's filter pills and the breakdown rows
 *  all list the types the same way. */
export const TYPE_ORDER = ["earned", "sick", "bereavement", "comp_off"];

export function typeRank(code: string | undefined): number {
  const rank = TYPE_ORDER.indexOf(code ?? "");
  return rank === -1 ? TYPE_ORDER.length : rank;
}

/** The type pill's short tag — the name's initials ("Earned Leave" → EL). */
export function typeTag(name: string): string {
  return name
    .split(/\s+/)
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

/** A compact label — the type name without its trailing "Leave"
 *  ("Sick Leave" → "Sick"; "Comp Off" stays whole). */
export function typeShort(name: string): string {
  return name.replace(/\s+Leave$/, "") || name;
}

/** One type counted across a set of requests — the day modal's out-strip
 *  chips and filter pills, and the calendar tab's filter bar. */
export interface TypeGroup {
  id: string;
  name: string;
  code: string | undefined;
  /** Requests of this type in the set. */
  count: number;
  rank: number;
}

/** Groups requests by their leave type in catalog order; rows without a
 *  type (legacy, or the fields not yet served) contribute nothing — the
 *  callers hide their type UI when the result is empty. */
export function buildTypeGroups(rows: LeaveRow[]): TypeGroup[] {
  const byId = new Map<string, TypeGroup>();
  for (const row of rows) {
    if (row.leaveTypeId === undefined || row.leaveTypeName === undefined) continue;
    const group = byId.get(row.leaveTypeId) ?? {
      id: row.leaveTypeId,
      name: row.leaveTypeName,
      code: row.leaveTypeCode,
      count: 0,
      rank: typeRank(row.leaveTypeCode),
    };
    group.count += 1;
    byId.set(row.leaveTypeId, group);
  }
  return [...byId.values()].sort((a, b) => a.rank - b.rank);
}
