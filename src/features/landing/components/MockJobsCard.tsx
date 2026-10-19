import { CircleCheckBig, MapPin } from "lucide-react";
import { PulseDot } from "../../../components/ui/PulseDot";
import styles from "./MockJobsCard.module.css";

// Sample data for the landing page only. These are not real jobs or people.
type AvatarTone = "violet" | "blue" | "orange";
type JobStatus = "route" | "progress" | "done";

interface MockJob {
  initials: string;
  tone: AvatarTone;
  name: string;
  meta: string;
  status: JobStatus;
  statusLabel: string;
}

const JOBS: MockJob[] = [
  {
    initials: "RK",
    tone: "violet",
    name: "AC service · Sector 12",
    meta: "Ravi K. · ETA 14 min",
    status: "route",
    statusLabel: "On the way",
  },
  {
    initials: "SM",
    tone: "blue",
    name: "Pipe repair · Green Park",
    meta: "Sana M. · started 10:42",
    status: "progress",
    statusLabel: "In progress",
  },
  {
    initials: "AT",
    tone: "orange",
    name: "Delivery · 4 parcels",
    meta: "Arjun T. · 09:30",
    status: "done",
    statusLabel: "Completed",
  },
];

const AVATAR_CLASS: Record<AvatarTone, string> = {
  violet: styles.avatarViolet,
  blue: styles.avatarBlue,
  orange: styles.avatarOrange,
};

const STATUS_CLASS: Record<JobStatus, string> = {
  route: styles.statusRoute,
  progress: styles.statusProgress,
  done: styles.statusDone,
};

export function MockJobsCard() {
  return (
    <section className={styles.visual}>
      <div className={`${styles.float} ${styles.float1}`}>
        <span className={`${styles.floatDot} ${styles.dotBlue}`}>
          <MapPin className={styles.floatIcon} aria-hidden="true" focusable="false" />
        </span>
        <span className={styles.floatLabel}>Technician en&nbsp;route</span>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.cardTitle}>Today&apos;s jobs</span>
          <span className={styles.cardLive}>
            <PulseDot /> Live
          </span>
        </div>

        {JOBS.map((job) => (
          <div className={styles.task} key={job.initials}>
            <span className={`${styles.avatar} ${AVATAR_CLASS[job.tone]}`}>{job.initials}</span>
            <div className={styles.taskInfo}>
              <div className={styles.taskName}>{job.name}</div>
              <div className={styles.taskMeta}>{job.meta}</div>
            </div>
            <span className={`${styles.status} ${STATUS_CLASS[job.status]}`}>
              {job.statusLabel}
            </span>
          </div>
        ))}
      </div>

      <div className={`${styles.float} ${styles.float2}`}>
        <span className={`${styles.floatDot} ${styles.dotGreen}`}>
          <CircleCheckBig className={styles.floatIcon} aria-hidden="true" focusable="false" />
        </span>
        <span className={styles.floatLabel}>Job marked done</span>
      </div>
    </section>
  );
}
