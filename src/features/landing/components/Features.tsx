import { Link } from "react-router";
import { Container } from "../../../components/ui/Container";
import { SectionHeading } from "../../../components/ui/SectionHeading";
import { MapArt, PhotoArt, ProgressArt, RouteArt, SignatureArt } from "./FeatureArt";
import styles from "./Features.module.css";

// Preview panels show example data only. They are decorative, so screen readers skip them.
const BLOCKS = [
  {
    key: "jobs",
    title: "Jobs and live status",
    pill: "Live updates",
    pillTone: "progress",
    text: "Create jobs and follow each step as it changes.",
  },
  {
    key: "proof",
    title: "Photos and signatures",
    pill: "Proof of work",
    pillTone: "neutral",
    text: "Technicians add photos and the customer's signature.",
  },
  {
    key: "customers",
    title: "Customers and addresses",
    pill: "Address search",
    pillTone: "neutral",
    text: "Save customers with address search, then open directions in one tap.",
  },
  {
    key: "attendance",
    title: "Attendance and leave",
    pill: "Office locations",
    pillTone: "neutral",
    text: "Check in at your office locations, see monthly attendance, and handle leave requests.",
  },
] as const;

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
            <li key={block.key} className={styles.card}>
              <div className={styles.top}>
                <h3 className={styles.title}>{block.title}</h3>
                <span className={`${styles.pill} ${styles[block.pillTone]}`}>{block.pill}</span>
              </div>
              <p className={styles.text}>{block.text}</p>
              <div
                className={
                  block.key === "attendance"
                    ? `${styles.preview} ${styles.previewFill}`
                    : styles.preview
                }
                aria-hidden="true"
              >
                {block.key === "jobs" && (
                  <>
                    <div className={styles.previewHead}>
                      <span className={styles.previewValue}>Commercial HVAC Service</span>
                      <span className={`${styles.pill} ${styles.progress}`}>In progress</span>
                    </div>
                    <div className={styles.steps}>
                      <span className={styles.previewLabel}>Scheduled</span>
                      <span className={styles.previewCurrent}>In progress</span>
                      <span className={styles.previewLabel}>Done</span>
                    </div>
                    <ProgressArt />
                    <div className={styles.person}>
                      <span className={styles.avatar}>RK</span>
                      <span className={styles.previewValue}>Ravi Kumar</span>
                    </div>
                  </>
                )}
                {block.key === "proof" && (
                  <div className={styles.proofRow}>
                    <span className={styles.photoFrame}>
                      <PhotoArt />
                    </span>
                    <span className={styles.signoff}>
                      <span className={styles.previewLabel}>Customer sign-off</span>
                      <SignatureArt />
                      <span className={styles.previewLabel}>Signed by Priya Sharma</span>
                    </span>
                  </div>
                )}
                {block.key === "customers" && (
                  <div className={styles.customerRow}>
                    <RouteArt />
                    <span className={styles.previewValue}>Sharma Traders Pvt. Ltd.</span>
                    <span className={styles.previewLabel}>42 MG Road, Bengaluru</span>
                    <span className={styles.directions}>Directions</span>
                  </div>
                )}
                {block.key === "attendance" && (
                  <>
                    <MapArt />
                    <span className={styles.mapLabel}>
                      <span className={styles.previewValue}>HQ Connaught Place</span>
                      <span className={styles.previewLabel}>Checked in 8:45 AM</span>
                      <span className={`${styles.pill} ${styles.done}`}>
                        Leave request approved
                      </span>
                    </span>
                  </>
                )}
              </div>
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
