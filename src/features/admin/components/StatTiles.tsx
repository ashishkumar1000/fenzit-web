import type { CSSProperties } from "react";
import { StatusBadge } from "./Badge";
import styles from "./StatTiles.module.css";

export interface StatTile {
  label: string;
  value: string | number;
  /** Optional status word rendered as a badge under the value. */
  status?: string;
}

/** The glanceable row: big numbers first, like the CLI's stats screen. Tiles
 *  rise in with a small stagger; reduced-motion users get them instantly. */
export function StatTiles({ tiles }: { tiles: StatTile[] }) {
  return (
    <div className={styles.row}>
      {tiles.map((tile, i) => (
        <div key={tile.label} className={styles.tile} style={{ "--i": i } as CSSProperties}>
          <p className={styles.value}>{tile.value}</p>
          <p className={styles.label}>{tile.label}</p>
          {tile.status ? <StatusBadge status={tile.status} /> : null}
        </div>
      ))}
    </div>
  );
}
