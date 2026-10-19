import { CircleCheck, Zap } from "lucide-react";
import { Container } from "../../../components/ui/Container";
import { SectionHeading } from "../../../components/ui/SectionHeading";
import styles from "./HowItWorks.module.css";

// Preview panels show example data only. They are decorative, so screen readers skip them.
const STEPS = [
  {
    key: "job",
    number: "01",
    label: "Setup",
    labelTone: "neutral",
    title: "Set up the job",
    text: "Pick the customer and the skill the job needs.",
  },
  {
    key: "assign",
    number: "02",
    label: "By skill",
    labelTone: "progress",
    title: "Assign by skill",
    text: "Jobs go to technicians who have that skill.",
  },
  {
    key: "done",
    number: "03",
    label: "Step by step",
    labelTone: "done",
    title: "Track it to done",
    text: "Watch each step move from scheduled to done, with the proof attached.",
  },
] as const;

export function HowItWorks() {
  return (
    <section id="how-it-works" className={styles.section} aria-labelledby="how-title">
      <Container>
        <SectionHeading
          id="how-title"
          title="How a job works"
          lead="Jobs are one way to use Fenzit. Attendance and leave work on their own."
        />
        <ol className={styles.list}>
          {STEPS.map((step) => (
            <li key={step.key} className={styles.card}>
              <div className={styles.top}>
                <span className={styles.number} aria-hidden="true">
                  {step.number}
                </span>
                <span className={`${styles.pill} ${styles[step.labelTone]}`}>{step.label}</span>
              </div>
              <h3 className={styles.title}>{step.title}</h3>
              <p className={styles.text}>{step.text}</p>
              <div className={styles.preview} aria-hidden="true">
                {step.key === "job" && (
                  <div className={styles.previewRow}>
                    <span className={styles.previewValue}>Sharma Traders Pvt. Ltd.</span>
                    <span className={styles.chip}>
                      <Zap className={styles.chipIcon} focusable="false" />
                      HVAC skill
                    </span>
                  </div>
                )}
                {step.key === "assign" && (
                  <div className={`${styles.previewRow} ${styles.previewRowAssign}`}>
                    <span className={styles.avatar}>RK</span>
                    <span className={styles.person}>
                      <span className={styles.previewValue}>Ravi Kumar</span>
                      <span className={styles.previewLabel}>HVAC skill</span>
                    </span>
                    <span className={`${styles.pill} ${styles.progress}`}>Assigned</span>
                  </div>
                )}
                {step.key === "done" && (
                  <div className={styles.previewRow}>
                    <span className={styles.statusRow}>
                      <span className={styles.previewLabel}>Scheduled</span>
                      <span className={styles.previewLabel}>In progress</span>
                      <span className={styles.done}>Done</span>
                    </span>
                    <span className={styles.proof}>
                      <CircleCheck className={styles.proofIcon} focusable="false" />2 photos and a
                      signature
                    </span>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
