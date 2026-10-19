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
      "Create jobs and assign the right skill and team.",
      "Turn on attendance, set office locations and approve leave.",
      "See live job status, and get PDF reports.",
    ],
  },
  {
    key: "technicians",
    icon: Wrench,
    title: "For technicians",
    points: [
      "Check in and out, and see your own month.",
      "Apply for leave from your phone.",
      "See today's jobs, and mark each step done with photos and the customer's signature.",
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
          lead="Owners set up jobs and attendance. Your team uses the app on their phones."
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
