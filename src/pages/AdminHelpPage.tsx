import { Link } from "react-router";
import { ChevronDown, Mail, Phone } from "lucide-react";
import { LinkButton } from "../components/ui/LinkButton";
import { SectionCard } from "../features/admin/components/SectionCard";
import { CONTACT_EMAIL, SALES_PHONE_DISPLAY, SALES_PHONE_HREF } from "../config/contact";
import styles from "./AdminHelpPage.module.css";

/**
 * The console's Help & Support page (design 2026-11-27): the two ways to
 * reach the Fenzit team, the questions support answers most, and one last
 * way out. Every question describes a screen that exists today — Settings is
 * named as not shipped, matching its disabled sidebar row.
 */

const FAQS: Array<{ question: string; answer: string }> = [
  {
    question: "How do I add someone to my team?",
    answer:
      "Open Employees and choose Add Employee. They sign in with their phone number and a one-time code.",
  },
  {
    question: "How do I assign a job?",
    answer:
      "Open Jobs and create a job, or choose Assign Job on an employee's profile to pick them in advance.",
  },
  {
    question: "Why can a salary not be set?",
    answer:
      "A salary structure comes first. Open the employee's Salary tab and choose Manage salary, then add the components — the monthly total is calculated for you.",
  },
  {
    question: "How do attendance and leave work?",
    answer:
      "Employees mark attendance in the Fenzit app. Leave requests appear under Leave for the owner or manager to approve.",
  },
  {
    question: "Can I change company settings?",
    answer:
      "Settings is not available yet. Write to us and we will help with changes until it ships.",
  },
  {
    question: "Where can I see payslips?",
    answer: "Each employee's Salary tab lists the payslips generated for them.",
  },
];

export function AdminHelpPage() {
  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <nav className={styles.crumbs} aria-label="Breadcrumb">
          <Link to="/admin" className={styles.crumbRoot}>
            Console
          </Link>
          <span className={styles.crumbSep} aria-hidden="true">
            ›
          </span>
          <span className={styles.crumbHere} aria-current="page">
            Help &amp; Support
          </span>
        </nav>
        <h1 className={styles.title}>Help &amp; Support</h1>
        <p className={styles.subtitle}>Answers and a direct line to the Fenzit team.</p>
      </header>

      {/* The contact cards are the page's primary action; the heading is
          visually hidden so heading navigation reaches them without changing
          the design. */}
      <h2 className={styles.srOnly}>Contact us</h2>
      <div className={styles.contacts}>
        <a className={styles.contact} href={`mailto:${CONTACT_EMAIL}`}>
          <span className={styles.contactIcon} aria-hidden="true">
            <Mail size={18} strokeWidth={1.75} />
          </span>
          <span className={styles.contactText}>
            <span className={styles.contactLabel}>Email us</span>
            <span className={styles.contactValue}>{CONTACT_EMAIL}</span>
            <span className={styles.contactHint}>We reply within one working day.</span>
          </span>
        </a>
        <a className={styles.contact} href={SALES_PHONE_HREF}>
          <span className={styles.contactIcon} aria-hidden="true">
            <Phone size={18} strokeWidth={1.75} />
          </span>
          <span className={styles.contactText}>
            <span className={styles.contactLabel}>Call us</span>
            <span className={styles.contactValue}>{SALES_PHONE_DISPLAY}</span>
            <span className={styles.contactHint}>Mon to Sat, 10am to 7pm IST.</span>
          </span>
        </a>
      </div>

      <SectionCard
        title="Common questions"
        subtitle="Quick guides on common workflows and system functions."
        headingLevel={2}
        meta={
          <span className={styles.topicCount}>
            {FAQS.length} {FAQS.length === 1 ? "topic" : "topics"}
          </span>
        }
      >
        <div className={styles.faq}>
          {FAQS.map((faq, index) => (
            <details key={faq.question} className={styles.faqItem} open={index === 0}>
              <summary className={styles.faqQuestion}>
                <span>{faq.question}</span>
                <ChevronDown className={styles.chevron} size={16} aria-hidden="true" />
              </summary>
              <p className={styles.faqAnswer}>{faq.answer}</p>
            </details>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Still need help?"
        subtitle="Write to us and a person will get back to you."
        headingLevel={2}
      >
        <p className={styles.tipsLead}>What to include</p>
        <ul className={styles.tips}>
          <li>The employee&rsquo;s name and employee code, if the question is about someone.</li>
          <li>The screen you were on, and what you expected to happen.</li>
          <li>A screenshot, if something looked wrong.</li>
        </ul>
        <div className={styles.actions}>
          <LinkButton href={`mailto:${CONTACT_EMAIL}`} variant="primary">
            <Mail size={16} aria-hidden="true" />
            Email support
          </LinkButton>
        </div>
      </SectionCard>
    </div>
  );
}
