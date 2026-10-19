import { LocateFixed, ShieldCheck, Smartphone, type LucideIcon } from "lucide-react";
import { Container } from "../../../components/ui/Container";
import { SectionHeading } from "../../../components/ui/SectionHeading";
import styles from "./Trust.module.css";

type TrustPoint = {
  key: string;
  icon: LucideIcon;
  text: string;
};

const POINTS: TrustPoint[] = [
  {
    key: "sign-in",
    icon: Smartphone,
    text: "Sign in with your phone number and a one-time code.",
  },
  {
    key: "separate",
    icon: ShieldCheck,
    text: "Each company sees only its own jobs, attendance, people and reports.",
  },
  {
    key: "location",
    icon: LocateFixed,
    text: "Location is taken only at job steps and attendance check-ins that need it.",
  },
];

export function Trust() {
  return (
    <section className={styles.section} aria-labelledby="trust-title">
      <Container>
        <SectionHeading id="trust-title" title="Your business, kept separate" />
        <ul className={styles.list}>
          {POINTS.map((point) => {
            const Icon = point.icon;
            return (
              <li key={point.key} className={styles.item}>
                <Icon className={styles.icon} aria-hidden="true" focusable="false" />
                <span>{point.text}</span>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
