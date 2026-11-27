import { type ReactNode } from "react";
import { SkeletonBlock, SkeletonList } from "../../../components/ui/Skeleton";
import { StatusBadge } from "./Badge";
import styles from "./Table.module.css";

export interface TableCell {
  text: string;
  /** An interactive control rendered in place of the text (rare — the
   *  employees page's job-settings button). The control's own visible label
   *  names the cell for assistive tech, so `text` is only a fallback for the
   *  code paths that render it. */
  node?: ReactNode;
  /** Render as a status badge (tone from the design system's vocabulary). */
  status?: boolean;
  /** De-emphasise (identifiers, timestamps). */
  quiet?: boolean;
}

type TableProps = {
  columns: string[];
  rows: TableCell[][];
  empty: string;
};

/** A dense read-only table. Rows are plain data — every dynamic value that
 *  carries a state goes through StatusBadge so colour is never alone. */
export function DataTable({ columns, rows, empty }: TableProps) {
  if (rows.length === 0) {
    return (
      <p className={styles.empty} aria-live="polite">
        {empty}
      </p>
    );
  }
  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} scope="col" className={styles.th}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, r) => (
            <tr key={r} className={styles.tr}>
              {cells.map((cell, c) => {
                const content = cell.status ? (
                  <StatusBadge status={cell.text} />
                ) : cell.node !== undefined ? (
                  cell.node
                ) : (
                  <span className={cell.quiet ? styles.quiet : styles.cell}>{cell.text}</span>
                );
                // The first cell is the row's own key (the job number, the
                // person, the date), so it names the row for assistive tech.
                return c === 0 ? (
                  <th key={c} scope="row" className={styles.rowHead}>
                    {content}
                  </th>
                ) : (
                  <td key={c} className={styles.td}>
                    {content}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Shimmering placeholder rows shown while a section's data is in flight.
 *  Rebuilt 2026-11-26 on the shared skeleton primitives: the same rows, the
 *  same 14px lines and the every-third-line-short rhythm the tables always
 *  had, now drawn by the one shimmer system the whole console shares. Still
 *  purely decorative — the pages announce the load around it. */
export function TableSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <SkeletonList>
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonBlock key={i} width={i % 3 === 1 ? "45%" : undefined} />
      ))}
    </SkeletonList>
  );
}
