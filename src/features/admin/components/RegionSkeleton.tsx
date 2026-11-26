import { SkeletonBlock, SkeletonList, SkeletonRow } from "../../../components/ui/Skeleton";
import styles from "./RegionSkeleton.module.css";

/**
 * Region skeleton compositions (CAP-3, 2026-11-26): panel-shaped placeholder
 * recipes pages drop into a `SkeletonSlot` while a region of the page
 * reloads, built on the shared skeleton primitives. Each recipe mirrors the
 * real region's shape — a SectionCard panel with rows, the tally tiles row,
 * a stat block — so the shimmer occupies the content's dimensions and the
 * region never shifts when the data lands.
 *
 * They are purely decorative (the primitives carry aria-hidden); the page
 * announces the load around the slot.
 */

/** A dataset panel mid-load: the SectionCard recipe (white card, hairline,
 *  its header line) with a table of proportional rows standing in. */
export function RegionTableSkeleton({
  rows = 7,
  columns = [2.5, 2, 1.5, 1.5, 1, 1],
}: {
  rows?: number;
  columns?: ReadonlyArray<number | string>;
}) {
  return (
    <div className={styles.card}>
      <SkeletonBlock width="26%" height={12} />
      <SkeletonList rows={rows} cells={columns} />
    </div>
  );
}

/** A lone table region (no card around it): just the rows, sized like the
 *  list it stands in for. */
export function RegionRowsSkeleton({
  rows = 7,
  columns = [2.5, 2, 1.5, 1.5, 1, 1],
}: {
  rows?: number;
  columns?: ReadonlyArray<number | string>;
}) {
  return <SkeletonList rows={rows} cells={columns} />;
}

/** The tally tiles' row mid-load: the ConsoleTiles recipe (auto-fit card
 *  tiles) with a label, a value and a sub line standing in per tile. */
export function RegionTilesSkeleton({ tiles = 4 }: { tiles?: number }) {
  return (
    <div className={styles.tiles}>
      {Array.from({ length: tiles }, (_, index) => (
        <div key={index} className={styles.tile}>
          <SkeletonBlock width="55%" height={9} />
          <SkeletonBlock width="34%" height={22} />
          <SkeletonBlock width="82%" height={9} />
        </div>
      ))}
    </div>
  );
}

/** One wide stat band mid-load (the overview's summary pills, the
 *  attendance total): a card with a label, a big value and a caption. */
export function RegionStatSkeleton() {
  return (
    <div className={styles.card}>
      <div className={styles.statRow}>
        <SkeletonBlock width="46%" height={9} />
        <SkeletonBlock width="18%" height={26} />
      </div>
      <SkeletonBlock width="72%" height={9} />
    </div>
  );
}

/** A detail page's body mid-load: a heading line, a lede line, then the
 *  wide panel with its field rows. */
export function RegionDetailSkeleton() {
  return (
    <div className={styles.detail}>
      <SkeletonBlock width="34%" height={20} />
      <SkeletonBlock width="58%" height={10} />
      <div className={styles.card}>
        <SkeletonBlock width="30%" height={12} />
        <SkeletonList rows={5} cells={[2.2, 2.2, 1.6]} />
      </div>
    </div>
  );
}

/** A form region mid-load: label + field pairs inside the card panel. */
export function RegionFormSkeleton({ fields = 5 }: { fields?: number }) {
  return (
    <div className={styles.card}>
      {Array.from({ length: fields }, (_, index) => (
        // The field cell is a flex weight (1), not a fixed width — a string
        // "1" would be a unitless width the browser drops, collapsing it.
        <SkeletonRow key={index} cells={["30%", 1]} height={20} />
      ))}
    </div>
  );
}
