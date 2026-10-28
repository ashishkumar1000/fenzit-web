import { Lock, Mail, PhoneCall, ShieldCheck } from "lucide-react";
import { LinkButton } from "../../../components/ui/LinkButton";
import { CONTACT_EMAIL, SALES_PHONE_DISPLAY, SALES_PHONE_HREF } from "../../../config/contact";
import styles from "./AfterTrial.module.css";

/** The contact block for a price after the trial. Phone, email and demo all reach the team. */
export function AfterTrial() {
  return (
    <section className={styles.section} aria-labelledby="after-title">
      <div className={styles.card}>
        <p className={styles.badge}>
          <ShieldCheck aria-hidden="true" focusable="false" size={16} />
          No surprises
        </p>
        <h2 id="after-title" className={styles.title}>
          After the trial
        </h2>
        <p className={styles.text}>
          We will tell you your price before the 90 days end. Ask us any time.
        </p>
        <p className={styles.text}>Want a quote today? Talk to our team.</p>
        <div className={styles.actions}>
          <LinkButton href={SALES_PHONE_HREF} variant="secondary">
            <PhoneCall
              className={styles.buttonIcon}
              aria-hidden="true"
              focusable="false"
              size={18}
            />
            {SALES_PHONE_DISPLAY}
          </LinkButton>
          <LinkButton href={`mailto:${CONTACT_EMAIL}`} variant="secondary">
            <Mail className={styles.buttonIcon} aria-hidden="true" focusable="false" size={18} />
            {CONTACT_EMAIL}
          </LinkButton>
          <LinkButton to="/book-demo" variant="primary">
            Book a 15-minute demo
          </LinkButton>
        </div>
        <p className={styles.footnote}>
          <span className={styles.footItem}>
            <Lock aria-hidden="true" focusable="false" size={14} />
            Your data is yours
          </span>
          <span className={styles.footItem}>
            <ShieldCheck aria-hidden="true" focusable="false" size={14} />
            You own your data. Get PDF reports anytime.
          </span>
        </p>
      </div>
    </section>
  );
}
