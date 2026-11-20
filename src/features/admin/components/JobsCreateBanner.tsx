import { Link } from "react-router";
import styles from "./JobsCreateBanner.module.css";

/** The create banner: the dark gradient strip the design shows above the
 *  list — one line of what a job is for, and the one action. */
export function JobsCreateBanner() {
  return (
    <section className={styles.banner} aria-label="Create a job">
      <div className={styles.copy}>
        <h2 className={styles.title}>Send the next job out</h2>
        <p className={styles.lede}>
          Create a job for a customer, assign it to any employee, and follow it step by step until
          it is done.
        </p>
      </div>
      <Link to="/admin/company/jobs/new" className={styles.cta}>
        Create a job
      </Link>
    </section>
  );
}
