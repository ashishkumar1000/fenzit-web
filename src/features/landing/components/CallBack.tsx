import { Container } from "../../../components/ui/Container";
import { SectionHeading } from "../../../components/ui/SectionHeading";
import { CallBackForm } from "./ContactForms";
import styles from "./CallBack.module.css";

/** A short section on the home page where a visitor can ask for a call back. */
export function CallBack() {
  return (
    <section id="call-back" className={styles.section} aria-labelledby="call-back-title">
      <Container>
        <SectionHeading
          id="call-back-title"
          title="Get a call from our team"
          lead="Give your phone number or email and we will call you back. To join the early-access list, use the form below."
        />
        <div className={styles.form}>
          <CallBackForm />
        </div>
      </Container>
    </section>
  );
}
