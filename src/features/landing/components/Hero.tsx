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
              Run your field team <span className={styles.accent}>in real time.</span>
            </h1>
            <p className={styles.sub}>
              Assign jobs, send your team out, and watch each job move from scheduled to done, all
              from one screen.
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
