import styles from "./JobsPreview.module.css";

type JobStatus = "done" | "progress" | "scheduled";

type JobRow = {
  id: string;
  title: string;
  person: string;
  time: string;
  status: JobStatus;
  label: string;
};

// Sample rows only. The panel says so on screen, so nobody reads them as real customers.
const SAMPLE_JOBS: JobRow[] = [
  {
    id: "water-tank",
    title: "Water tank cleaning",
    person: "Ravi K.",
    time: "9:00 AM",
    status: "done",
    label: "Done",
  },
  {
    id: "pump-repair",
    title: "Pump repair",
    person: "Sunita M.",
    time: "11:30 AM",
    status: "progress",
    label: "In Progress",
  },
  {
    id: "gate-fitting",
    title: "Gate fitting",
    person: "Arjun T.",
    time: "2:00 PM",
    status: "scheduled",
    label: "Scheduled",
  },
];

const STATUS_CLASS: Record<JobStatus, string> = {
  done: styles.done,
  progress: styles.progress,
  scheduled: styles.scheduled,
};

/** A flat example of the owner's job list, drawn with the app's status colours. */
export function JobsPreview() {
  return (
    <section className={styles.card} aria-label="Example job list">
      <div className={styles.head}>
        <p className={styles.title}>{"Today's jobs"}</p>
        <p className={styles.caption}>Example data</p>
      </div>
      <ul className={styles.list}>
        {SAMPLE_JOBS.map((job) => (
          <li key={job.id} className={styles.row}>
            <div className={styles.main}>
              <p className={styles.job}>{job.title}</p>
              <p className={styles.meta}>
                {job.person}, {job.time}
              </p>
            </div>
            <span className={`${styles.badge} ${STATUS_CLASS[job.status]}`}>{job.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
