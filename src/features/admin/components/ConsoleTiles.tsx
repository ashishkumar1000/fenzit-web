import type { ComponentType } from "react";
import type { ConsoleIconProps } from "../../../components/ui/consoleIcons";
import { ConsoleTileArt } from "./ConsoleTileArt";
import styles from "./ConsoleTiles.module.css";

export type ConsoleTileTone = "primary" | "done" | "scheduled" | "violet";

/** The background artwork each tile tone carries. */
const ART_BY_TONE = {
  primary: "total",
  done: "active",
  scheduled: "invites",
  violet: "approval",
} as const;

/** One of the console's hand-drawn icons. */
export type ConsoleIcon = ComponentType<ConsoleIconProps>;

export interface ConsoleTile {
  label: string;
  value: string | number;
  /** A small coloured word beside the number, e.g. "Invited". */
  pill?: { label: string; tone: "done" | "scheduled" | "violet" };
  /** The muted line under the number. */
  sub?: string;
  /** A 0–100 progress bar under the number, the Active tile's share. */
  bar?: number;
  icon: ConsoleIcon;
  tone: ConsoleTileTone;
}

/**
 * The console's stat tile: label on top, the big number with its pill, and
 * the muted sub-line. One translucent circle sits in the corner as the
 * tile's depth, tinted by the tile's tone family. (The tinted icon chip
 * left with the owner's 2026-11-27 trim; `icon` stays in the contract so
 * the callers keep compiling — the field is simply not rendered.)
 */
export function ConsoleTiles({ tiles }: { tiles: ConsoleTile[] }) {
  return (
    <div className={styles.row}>
      {tiles.map((tile) => {
        return (
          <div key={tile.label} className={styles.tile} data-tone={tile.tone}>
            <ConsoleTileArt variant={ART_BY_TONE[tile.tone]} />
            <div className={styles.head}>
              <p className={styles.label}>{tile.label}</p>
            </div>
            <div className={styles.valueRow}>
              <p className={styles.value}>{tile.value}</p>
              {tile.pill ? (
                <span className={styles.pill} data-pill={tile.pill.tone}>
                  {tile.pill.label}
                </span>
              ) : null}
            </div>
            {tile.bar !== undefined ? (
              <span
                className={styles.barTrack}
                role="img"
                aria-label={`${tile.bar}% of all employees`}
              >
                <span
                  className={styles.barFill}
                  style={{ width: `${Math.min(100, Math.max(0, tile.bar))}%` }}
                />
              </span>
            ) : null}
            {tile.sub ? <p className={styles.sub}>{tile.sub}</p> : null}
          </div>
        );
      })}
    </div>
  );
}
