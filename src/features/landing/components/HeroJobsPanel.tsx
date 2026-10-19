import { Check, Clock, ClipboardList } from "lucide-react";
import { RouteArt } from "./FeatureArt";
import { HeroPanel, StatusPill, type Tone } from "./HeroPanel";
import styles from "./HeroJobsPanel.module.css";

type JobCard = {
  key: string;
  title: string;
  tone: Tone;
  statusLabel: string;
  meta: string;
  active?: boolean;
};

// Sample jobs. Each status is one the app shows: Scheduled, In progress and Done.
const JOBS: JobCard[] = [
  {
    key: "water-tank",
    title: "Water tank cleaning",
    tone: "done",
    statusLabel: "Done",
    meta: "Ravi K. • 9:00 AM",
  },
  {
    key: "pump-repair",
    title: "Pump repair",
    tone: "progress",
    statusLabel: "In progress",
    meta: "Sunita M. • 11:30 AM",
    active: true,
  },
  {
    key: "gate-fitting",
    title: "Gate fitting",
    tone: "scheduled",
    statusLabel: "Scheduled",
    meta: "Arjun T. • 2:00 PM",
  },
];

/** The owner's jobs for today, with the status of each one. */
export function HeroJobsPanel() {
  return (
    <HeroPanel
      title="Jobs"
      icon={<ClipboardList className={styles.glyph} aria-hidden="true" focusable="false" />}
    >
      <div className={styles.queue}>
        <div className={styles.labels}>
          <span className={styles.labelDone}>
            <Check className={styles.labelIcon} aria-hidden="true" focusable="false" />
            Completed (1)
          </span>
          <span className={styles.labelProgress}>In Progress (1)</span>
          <span className={styles.labelMuted}>Scheduled (1)</span>
        </div>
        <div className={styles.track} aria-hidden="true">
          <span className={styles.segDone} />
          <span className={styles.segProgress} />
          <span className={styles.segTodo} />
        </div>
        <div className={styles.times}>
          <span>9:00 AM</span>
          <span>2:00 PM</span>
        </div>
      </div>
      <ul className={styles.list}>
        {JOBS.map((job) => (
          <li key={job.key} className={job.active ? styles.cardActive : styles.card}>
            <div className={styles.cardHead}>
              <p className={styles.jobTitle}>{job.title}</p>
              <StatusPill tone={job.tone}>
                {job.tone === "done" ? (
                  <Check className={styles.pillIcon} aria-hidden="true" focusable="false" />
                ) : null}
                {job.tone === "scheduled" ? (
                  <Clock className={styles.pillIcon} aria-hidden="true" focusable="false" />
                ) : null}
                {job.statusLabel}
              </StatusPill>
            </div>
            <p className={styles.meta}>{job.meta}</p>
          </li>
        ))}
        <div className={styles.route}>
          <RouteArt />
        </div>
      </ul>
    </HeroPanel>
  );
}
