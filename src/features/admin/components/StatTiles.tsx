import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import { StatusBadge } from "./Badge";
import styles from "./StatTiles.module.css";

export type StatTileTone = "primary" | "done" | "scheduled" | "progress";

export interface StatTile {
  label: string;
  value: string | number;
  /** Optional status word rendered as a badge under the value. */
  status?: string;
  /** Optional icon in a tinted chip, the console tile's coloured corner. */
  icon?: LucideIcon;
  /** The icon chip's colour family. Defaults to the action blue. */
  tone?: StatTileTone;
}

/** The glanceable row: big numbers first, like the CLI's stats screen. Tiles
 *  rise in with a small stagger; reduced-motion users get them instantly.
 *  An icon + tone turn the plain tile into the console's coloured one; views
 *  that pass neither keep today's plain tile. */
export function StatTiles({ tiles }: { tiles: StatTile[] }) {
  return (
    <div className={styles.row}>
      {tiles.map((tile, i) => {
        const Icon = tile.icon;
        return (
          <div key={tile.label} className={styles.tile} style={{ "--i": i } as CSSProperties}>
            <div className={styles.top}>
              <p className={styles.value}>{tile.value}</p>
              {Icon ? (
                <span className={styles.iconChip} data-tone={tile.tone ?? "primary"}>
                  <Icon size={18} strokeWidth={2} aria-hidden="true" />
                </span>
              ) : null}
            </div>
            <p className={styles.label}>{tile.label}</p>
            {tile.status ? <StatusBadge status={tile.status} /> : null}
          </div>
        );
      })}
    </div>
  );
}
