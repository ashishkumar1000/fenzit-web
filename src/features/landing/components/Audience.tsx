import { Briefcase, CircleCheck, Wrench, type LucideIcon } from "lucide-react";
import { Container } from "../../../components/ui/Container";
import { SectionHeading } from "../../../components/ui/SectionHeading";
import styles from "./Audience.module.css";

type AudienceGroup = {
  key: string;
  icon: LucideIcon;
  title: string;
  points: string[];
};

const GROUPS: AudienceGroup[] = [
  {
    key: "owners",
    icon: Briefcase,
    title: "For owners",
    points: [
      "Create a job and assign the right skill and team.",
      "See every job's status live, from one screen.",
      "Get PDF reports for jobs and attendance.",
    ],
  },
  {
    key: "technicians",
    icon: Wrench,
    title: "For technicians",
    points: [
      "See today's jobs and the steps for each one.",
      "Check in and out, and see your own month.",
      "Mark each step done, with photos and the customer's signature.",
    ],
  },
];

export function Audience() {
  return (
    <section className={styles.section} aria-labelledby="audience-title">
      <Container>
        <SectionHeading
          id="audience-title"
          title="Built for owners and technicians"
          lead="Owners set up the work. Technicians do it. Each has what they need on one screen."
        />
        <div className={styles.grid}>
          {GROUPS.map((group) => {
            const Icon = group.icon;
            return (
              <article key={group.key} className={styles.card}>
                <span className={styles.iconWrap}>
                  <Icon className={styles.icon} aria-hidden="true" focusable="false" />
                </span>
                <h3 className={styles.cardTitle}>{group.title}</h3>
                <ul className={styles.list}>
                  {group.points.map((point) => (
                    <li key={point} className={styles.item}>
                      <CircleCheck className={styles.check} aria-hidden="true" focusable="false" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
