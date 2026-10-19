import { Container } from "../../../components/ui/Container";
import { SectionHeading } from "../../../components/ui/SectionHeading";
import styles from "./HowItWorks.module.css";

type Step = {
  key: string;
  title: string;
  text: string;
};

const STEPS: Step[] = [
  {
    key: "job",
    title: "Create a job",
    text: "Pick the customer and the skill the job needs.",
  },
  {
    key: "assign",
    title: "Assign by skill",
    text: "The job goes to the technicians who have that skill.",
  },
  {
    key: "done",
    title: "Track it to done",
    text: "Watch each step move from scheduled to done, with the proof attached.",
  },
];

export function HowItWorks() {
  return (
    <section className={styles.section} aria-labelledby="how-title">
      <Container>
        <SectionHeading id="how-title" title="How it works" />
        <ol className={styles.list}>
          {STEPS.map((step, index) => (
            <li key={step.key} className={styles.step}>
              <span className={styles.number} aria-hidden="true">
                {index + 1}
              </span>
              <h3 className={styles.title}>{step.title}</h3>
              <p className={styles.text}>{step.text}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
