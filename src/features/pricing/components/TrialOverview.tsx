import { Clock, Route } from "lucide-react";
import { CheckBadgeIcon } from "../PerkIcons";
import { LinkButton } from "../../../components/ui/LinkButton";
import { TRIAL_FEATURES } from "../pricingContent";
import styles from "./TrialOverview.module.css";

// Sample rows for the live simulator. Mock data until real account figures are wired in.
const SIMULATOR_ROWS = [
  {
    key: "checkin",
    icon: Clock,
    title: "Office check-in",
    detail: "Inside the office area",
    status: "Active",
  },
  {
    key: "updates",
    icon: Route,
    title: "Live job updates",
    detail: "Everyone on a job sees changes right away",
    status: "Live",
  },
];

/** The 90-day trial card, with a mock live simulator beside it. */
export function TrialOverview() {
  return (
    <section className={styles.section} aria-labelledby="trial-title">
      <div className={styles.card}>
        <div className={styles.copy}>
          <p className={styles.badge}>
            <span>100% free trial</span>
            <span className={styles.badgeTier}>Plan: all features</span>
          </p>
          <h2 id="trial-title" className={styles.title}>
            90 days free for every team
          </h2>
          <p className={styles.text}>
            Your team can use everything on our features page for the first 90 days.
          </p>
          <ul className={styles.features}>
            {TRIAL_FEATURES.map((feature) => (
              <li key={feature} className={styles.feature}>
                <CheckBadgeIcon className={styles.featureIcon} />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          <div className={styles.actions}>
            <LinkButton to="/features" variant="primary">
              See the features
            </LinkButton>
            <LinkButton to="/book-demo" variant="secondary">
              Book a demo
            </LinkButton>
          </div>
        </div>

        <aside className={styles.simulator} aria-label="Sample simulator">
          <div className={styles.simHead}>
            <span className={styles.dots} aria-hidden="true" />
            <span className={styles.simLabel}>Sample view · 90 days</span>
          </div>
          <ul className={styles.rows}>
            {SIMULATOR_ROWS.map((row) => (
              <li key={row.key} className={styles.row}>
                <row.icon className={styles.rowIcon} aria-hidden="true" focusable="false" />
                <div className={styles.rowText}>
                  <span className={styles.rowTitle}>{row.title}</span>
                  <span className={styles.rowDetail}>{row.detail}</span>
                </div>
                <span className={styles.rowStatus}>{row.status}</span>
              </li>
            ))}
          </ul>
          <p className={styles.note}>
            No contract to sign. We show prices only after the trial. You can cancel before day 90.
          </p>
        </aside>
      </div>
    </section>
  );
}
