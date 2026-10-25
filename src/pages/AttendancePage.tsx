import { CalendarCheck, FileText, LayoutDashboard, MapPin, Smartphone } from "lucide-react";
import { Link } from "react-router";
import { ATTENDANCE_PAGE } from "../app/pageMeta";
import { LinkButton } from "../components/ui/LinkButton";
import { Container } from "../components/ui/Container";
import { SectionHeading } from "../components/ui/SectionHeading";
import { AttendanceArt } from "../features/attendance/components/AttendanceArt";
import { Footer } from "../features/landing/components/Footer";
import { Header } from "../features/landing/components/Header";
import styles from "./AttendancePage.module.css";

const STEPS = [
  {
    key: "rules",
    icon: MapPin,
    title: "Set the rules once",
    text: "Office locations, working hours, weekly offs and holidays — attendance runs on your rules, not on memory.",
  },
  {
    key: "checkin",
    icon: Smartphone,
    title: "Check in from their own phone",
    text: "Employees check in and out in the Fenzit app. The button works inside their office location, so a check-in is GPS-verified.",
  },
  {
    key: "today",
    icon: LayoutDashboard,
    title: "See today, live",
    text: "A daily dashboard shows who is in, who is on leave and who had a short day — while the day is still on.",
  },
  {
    key: "month",
    icon: FileText,
    title: "Month-end, already done",
    text: "A monthly attendance report for each person. Need to fix a day? Correct it — the change keeps a record.",
  },
];

const LEAVE_POINTS = [
  "Employees apply for leave from the phone and see their own history.",
  "You approve or revoke in a tap — even on someone's behalf.",
  "Leave sits beside attendance, so one view answers both questions.",
];

const FAQ_ITEMS = [
  {
    key: "jobs",
    question: "Can I use attendance without the jobs part?",
    answer:
      "Yes. Attendance and leave is switched on separately, so you can use it without creating any jobs.",
  },
  {
    key: "app",
    question: "Do employees need to install an app?",
    answer:
      "Yes. Employees use the Fenzit mobile app and sign in with their phone number. We will share how to get it when access opens.",
  },
  {
    key: "office",
    question: "What if an employee is not at the office?",
    answer:
      "The check-in button stays locked until they are inside their office location. That is what makes a check-in trustworthy.",
  },
  {
    key: "offline",
    question: "Does it work offline?",
    answer: "Not yet. Employees need a mobile connection to check in and for updates.",
  },
  {
    key: "fix",
    question: "What about half days and mistakes?",
    answer:
      "Short days show on the daily dashboard, and you can correct any day's attendance — the change keeps a record.",
  },
];

export function AttendancePage() {
  return (
    <div className={styles.page}>
      <title>{ATTENDANCE_PAGE.title}</title>
      <Header />
      <main className={styles.main}>
        <section className={styles.hero} aria-labelledby="attendance-title">
          <Container>
            <Link className={styles.back} to="/">
              Back to home
            </Link>
            <div className={styles.heroGrid}>
              <div>
                <h1 id="attendance-title" className={styles.title}>
                  Attendance and leave, without the register
                </h1>
                <p className={styles.lead}>
                  Your team checks in from their own phones at the office. You see today live, get a
                  clean monthly report, and handle leave in a tap — on its own, or with Fenzit jobs.
                </p>
                <LinkButton to="/" variant="primary">
                  Join the early access list
                </LinkButton>
              </div>
              <div className={styles.artPanel}>
                <AttendanceArt />
              </div>
            </div>
          </Container>
        </section>

        <section className={styles.section} aria-labelledby="problem-title">
          <Container>
            <SectionHeading
              id="problem-title"
              title="The register lives at the office. Your team doesn't."
            />
            <ul className={styles.points}>
              <li>
                The paper register sits at the shop, so field employees never mark their day in it.
              </li>
              <li>Leave requests arrive as WhatsApp messages and get lost in the chat.</li>
              <li>At month-end you rebuild who came on which day — from memory.</li>
            </ul>
          </Container>
        </section>

        <section className={styles.section} aria-labelledby="how-title">
          <Container>
            <SectionHeading id="how-title" title="How attendance works in Fenzit" />
            <ol className={styles.steps}>
              {STEPS.map((step) => (
                <li key={step.key} className={styles.step}>
                  <span className={styles.stepIcon}>
                    <step.icon aria-hidden="true" focusable="false" />
                  </span>
                  <h3 className={styles.stepTitle}>{step.title}</h3>
                  <p className={styles.stepText}>{step.text}</p>
                </li>
              ))}
            </ol>
          </Container>
        </section>

        <section className={styles.section} aria-labelledby="leave-title">
          <Container>
            <SectionHeading id="leave-title" title="Leave, in the same place" />
            <ul className={styles.points}>
              {LEAVE_POINTS.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
            <p className={styles.leaveNote}>
              <CalendarCheck className={styles.leaveIcon} aria-hidden="true" focusable="false" />
              Attendance and leave ship together, but each can be switched on separately.
            </p>
          </Container>
        </section>

        <section className={styles.section} aria-labelledby="faq-title">
          <Container>
            <SectionHeading id="faq-title" title="Questions" />
            <div className={styles.faqList}>
              {FAQ_ITEMS.map((item) => (
                <details key={item.key} className={styles.faqItem}>
                  <summary className={styles.faqSummary}>{item.question}</summary>
                  <p className={styles.faqAnswer}>{item.answer}</p>
                </details>
              ))}
            </div>
          </Container>
        </section>

        <section className={styles.cta} aria-labelledby="cta-title">
          <Container>
            <h2 id="cta-title" className={styles.ctaTitle}>
              See it working for your team
            </h2>
            <p className={styles.ctaText}>
              Join the early access list, and we will email you as access opens.
            </p>
            <LinkButton to="/" variant="primary">
              Join the early access list
            </LinkButton>
            <p className={styles.ctaMore}>
              Want the whole picture?{" "}
              <Link className={styles.ctaLink} to="/features">
                See the full feature list
              </Link>
              .
            </p>
          </Container>
        </section>
      </main>
      <Footer />
    </div>
  );
}
