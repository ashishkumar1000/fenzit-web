import { CalendarCheck, Camera, ClipboardList, MapPin, type LucideIcon } from "lucide-react";
import { Container } from "../../../components/ui/Container";
import { SectionHeading } from "../../../components/ui/SectionHeading";
import styles from "./Features.module.css";

type FeatureBlock = {
  key: string;
  icon: LucideIcon;
  title: string;
  text: string;
};

const BLOCKS: FeatureBlock[] = [
  {
    key: "jobs",
    icon: ClipboardList,
    title: "Jobs and live status",
    text: "Create jobs and follow each step as it changes.",
  },
  {
    key: "proof",
    icon: Camera,
    title: "Photos and signatures",
    text: "Technicians add photos and the customer's signature at each step.",
  },
  {
    key: "customers",
    icon: MapPin,
    title: "Customers and addresses",
    text: "Save customers with address search, then open directions in one tap.",
  },
  {
    key: "attendance",
    icon: CalendarCheck,
    title: "Attendance and leave",
    text: "Check in at your office locations, see monthly attendance, and handle leave requests.",
  },
];

export function Features() {
  return (
    <section id="features" className={styles.section} aria-labelledby="features-title">
      <Container>
        <SectionHeading
          id="features-title"
          title="Everything your team needs, in one place"
          lead="Use any one of these on its own, or several together."
        />
        <ul className={styles.list}>
          {BLOCKS.map((block) => {
            const Icon = block.icon;
            return (
              <li key={block.key} className={styles.item}>
                <span className={styles.iconWrap}>
                  <Icon className={styles.icon} aria-hidden="true" focusable="false" />
                </span>
                <div>
                  <h3 className={styles.title}>{block.title}</h3>
                  <p className={styles.text}>{block.text}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
