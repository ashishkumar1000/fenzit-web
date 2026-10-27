import { Fragment } from "react";
import { StatusBadge } from "./Badge";
import styles from "./Table.module.css";

export interface TableCell {
  text: string;
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
              {cells.map((cell, c) => (
                <td key={c} className={styles.td}>
                  {cell.status ? (
                    <StatusBadge status={cell.text} />
                  ) : (
                    <span className={cell.quiet ? styles.quiet : styles.cell}>{cell.text}</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Shimmering placeholder rows shown while a section's data is in flight. */
export function TableSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className={styles.skeleton} aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <Fragment key={i}>
          <span className={styles.skeletonCell} data-w={i % 3 === 1 ? "short" : "long"} />
        </Fragment>
      ))}
    </div>
  );
}
