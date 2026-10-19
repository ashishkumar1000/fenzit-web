import { PulseDot } from "../../../components/ui/PulseDot";
import { NotifyForm } from "./NotifyForm";
import { UseCaseChips } from "./UseCaseChips";
import { MockJobsCard } from "./MockJobsCard";
import styles from "./Hero.module.css";

export function Hero() {
  return (
    <main className={styles.hero}>
      <section className={styles.copy}>
        <span className={styles.eyebrow}>
          <PulseDot /> Coming soon
        </span>
        <h1 className={styles.title}>
          Run your field team <span className={styles.accent}>in real time.</span>
        </h1>
        <p className={styles.sub}>
          Assign jobs, dispatch your team, and watch every task move from <em>assigned</em> to{" "}
          <em>done</em> — live, from one dashboard.
        </p>

        <UseCaseChips />
        <NotifyForm />
      </section>

      <MockJobsCard />
    </main>
  );
}
