import { Container } from "../../../components/ui/Container";
import { LinkButton } from "../../../components/ui/LinkButton";
import { JobsPreview } from "./JobsPreview";
import styles from "./Hero.module.css";

export function Hero() {
  return (
    <section className={styles.section} aria-labelledby="hero-title">
      <Container>
        <div className={styles.hero}>
          <div className={styles.copy}>
            <p className={styles.eyebrow}>
              <span className={styles.dot} aria-hidden="true" />
              Early access
            </p>
            <h1 id="hero-title" className={styles.title}>
              Run your jobs, attendance and leave{" "}
              <span className={styles.accent}>in one place.</span>
            </h1>
            <p className={styles.sub}>
              Use Fenzit for field jobs, for attendance and leave, or for both. Owners set it up
              once, and the team uses it on their phones.
            </p>
            <div className={styles.actions}>
              <LinkButton href="#early-access" variant="primary">
                Join early access
              </LinkButton>
              <LinkButton href="#features" variant="secondary">
                See what it does
              </LinkButton>
            </div>
          </div>
          <JobsPreview />
        </div>
      </Container>
    </section>
  );
}
