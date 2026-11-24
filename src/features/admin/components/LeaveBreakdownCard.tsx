import type { LeaveRow } from "../companyApi";
import { daysInMonth } from "../leaveDateMath";
import { typeRank, typeTag } from "../leaveTypeUi";
import { SectionCard } from "./SectionCard";
import styles from "./LeaveBreakdownCard.module.css";

/** One type's share of the month's leave — the breakdown row and its bar
 *  segment. Members and days are the design's units, not request counts. */
interface TypeSlice {
  id: string;
  name: string;
  code: string | undefined;
  members: Set<string>;
  days: number;
  rank: number;
}

/** The rail's Leave Breakdown: how the month's days out split across the
 *  typed catalog. The segmented bar carries each type's share of the TYPED
 *  days; the caption accounts honestly for untyped (legacy) leave too —
 *  "100% Accounted" only when every day carries a type. */
export function LeaveBreakdownCard({ month, rows }: { month: string; rows: LeaveRow[] }) {
  const slices = new Map<string, TypeSlice>();
  let totalDays = 0;
  const members = new Set<string>();
  for (const row of rows) {
    const days = daysInMonth(row.startDate, row.endDate, month);
    if (days === 0) continue;
    totalDays += days;
    members.add(row.employeeId);
    if (row.leaveTypeId === undefined || row.leaveTypeName === undefined) continue;
    const slice = slices.get(row.leaveTypeId) ?? {
      id: row.leaveTypeId,
      name: row.leaveTypeName,
      code: row.leaveTypeCode,
      members: new Set<string>(),
      days: 0,
      rank: typeRank(row.leaveTypeCode),
    };
    slice.days += days;
    slice.members.add(row.employeeId);
    slices.set(row.leaveTypeId, slice);
  }
  const ordered = [...slices.values()].sort((a, b) => a.rank - b.rank);
  const typedDays = ordered.reduce((sum, slice) => sum + slice.days, 0);

  return (
    <SectionCard
      title="Leave Breakdown"
      meta={`${month} • ${members.size} ${members.size === 1 ? "member" : "members"}, ${totalDays} ${totalDays === 1 ? "day" : "days"}`}
    >
      {totalDays === 0 ? (
        <p className={styles.empty}>No leave overlaps this month.</p>
      ) : ordered.length === 0 ? (
        <p className={styles.empty}>
          Leave exists but carries no type — the Types tab's catalog labels it.
        </p>
      ) : (
        <>
          <div
            className={styles.bar}
            role="img"
            aria-label={ordered.map((slice) => `${slice.name} ${slice.days} days`).join(", ")}
          >
            {ordered.map((slice) => (
              <span
                key={slice.id}
                className={styles.segment}
                data-code={slice.code}
                title={`${slice.name} (${slice.days} ${slice.days === 1 ? "day" : "days"})`}
                style={{ width: `${(slice.days / typedDays) * 100}%` }}
              />
            ))}
          </div>
          <p className={styles.caption}>
            <span>
              Distribution across {totalDays} {totalDays === 1 ? "day" : "days"}
            </span>
            <span className={styles.accounted} data-full={typedDays === totalDays || undefined}>
              {typedDays === totalDays
                ? "100% Accounted"
                : `${Math.round((typedDays / totalDays) * 100)}% typed`}
            </span>
          </p>
          <ul className={styles.rows}>
            {ordered.map((slice) => (
              <li key={slice.id} className={styles.row}>
                <span className={styles.tagTile} data-code={slice.code}>
                  {typeTag(slice.name)}
                </span>
                <span className={styles.rowBody}>
                  <span className={styles.rowName}>{slice.name}</span>
                  <span className={styles.rowMeta}>
                    {`${slice.members.size} ${slice.members.size === 1 ? "person" : "people"} • ${slice.days} ${slice.days === 1 ? "day" : "days"}`}
                  </span>
                </span>
                <span className={styles.daysChip} data-code={slice.code}>
                  {`${slice.days}d`}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </SectionCard>
  );
}
