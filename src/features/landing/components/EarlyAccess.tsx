import { Container } from "../../../components/ui/Container";
import { SectionHeading } from "../../../components/ui/SectionHeading";
import { NotifyForm } from "./NotifyForm";
import styles from "./EarlyAccess.module.css";

export function EarlyAccess() {
  return (
    <section id="early-access" className={styles.section} aria-labelledby="early-title">
      <Container>
        <div className={styles.panel}>
          <SectionHeading
            id="early-title"
            title="Join early access"
            lead="Leave your email and we will write when access opens. No spam."
          />
          <NotifyForm />
        </div>
      </Container>
    </section>
  );
}
