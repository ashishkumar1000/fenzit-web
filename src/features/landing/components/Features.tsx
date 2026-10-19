import { Link } from "react-router";
import { Container } from "../../../components/ui/Container";
import { SectionHeading } from "../../../components/ui/SectionHeading";
import styles from "./Features.module.css";

type FeatureBlock = {
  key: string;
  title: string;
  text: string;
};

// One line each. The full list lives on the /features page.
const BLOCKS: FeatureBlock[] = [
  {
    key: "jobs",
    title: "Jobs and live status",
    text: "Create jobs and follow each step as it changes.",
  },
  {
    key: "proof",
    title: "Photos and signatures",
    text: "Technicians add photos and the customer's signature at each step.",
  },
  {
    key: "customers",
    title: "Customers and addresses",
    text: "Save customers with address search, then open directions in one tap.",
  },
  {
    key: "attendance",
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
          {BLOCKS.map((block) => (
            <li key={block.key} className={styles.item}>
              <h3 className={styles.title}>{block.title}</h3>
              <p className={styles.text}>{block.text}</p>
            </li>
          ))}
        </ul>
        <Link className={styles.more} to="/features">
          See the full feature list
        </Link>
      </Container>
    </section>
  );
}
