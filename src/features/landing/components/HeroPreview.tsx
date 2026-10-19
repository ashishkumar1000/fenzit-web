import { DotGridArt } from "./FeatureArt";
import { HeroAttendancePanel } from "./HeroAttendancePanel";
import { HeroJobsPanel } from "./HeroJobsPanel";
import styles from "./HeroPreview.module.css";

/** A flat sample of the app: the jobs queue and attendance and leave, side by side. */
export function HeroPreview() {
  return (
    <section className={styles.card} aria-label="Sample of the Fenzit app">
      <DotGridArt />
      <div className={styles.panels}>
        <HeroJobsPanel />
        <HeroAttendancePanel />
      </div>
    </section>
  );
}
