import { ClipboardList, FileText, Store, Users } from "lucide-react";
import { SERVICE_BUSINESS_PAGE } from "../../../app/pageMeta";
import { ServiceBusinessArt } from "../art/ServiceBusinessArt";
import type { UseCaseContent } from "../components/UseCasePage";

export const SERVICE_BUSINESS_CONTENT: UseCaseContent = {
  meta: SERVICE_BUSINESS_PAGE,
  art: ServiceBusinessArt,
  shortLabel: "Service businesses",
  heading: "Run jobs, attendance and leave from one app",
  lead: "Fenzit is a phone-first app for service businesses — repairs, cleaning, installation and similar work. Assign jobs to your team, see who has checked in, approve leave, and close the week with reports, all from your phone.",
  problemHeading: "Jobs in one place, attendance in another, and leave on phone calls",
  problem: [
    "Jobs are noted in one place, attendance is marked in another, and leave is settled over phone calls.",
    "A customer asks for status, and you first have to reach the employee who did the job.",
    "Who came in, who is on leave, which jobs are done — it all runs on your memory, and some of it slips.",
  ],
  stepsHeading: "How the day runs in Fenzit",
  steps: [
    {
      key: "team",
      icon: Users,
      title: "Add your team and office location",
      text: "Add your employees and your office location. Each one signs in to the Fenzit app on their own phone with a phone-number OTP — there is no extra device.",
    },
    {
      key: "day",
      icon: Store,
      title: "Run the day",
      text: "Assign jobs with the steps to follow, and check-ins appear on your phone as employees mark attendance at the office. Leave requests come to the app, not to a phone call.",
    },
    {
      key: "status",
      icon: ClipboardList,
      title: "Answer any customer with status",
      text: "Every job's status is on your phone as it changes, with photos and the customer's signature as proof. You can answer a customer without calling your employee.",
    },
    {
      key: "reports",
      icon: FileText,
      title: "Close the week",
      text: "Download PDF reports for jobs and attendance to review the week or share the month's numbers.",
    },
  ],
  faq: [
    {
      key: "who",
      question: "Who is Fenzit for?",
      answer:
        "Owners of small field-service businesses — repairs, cleaning, installation and similar work — who send employees to customer sites and also need to know who reached the office, who is on leave, and what was finished.",
    },
    {
      key: "separate",
      question: "Do I have to use jobs and attendance together?",
      answer:
        "No. Attendance and leave are switched on separately from jobs. A business can run jobs only, attendance and leave only, or both — you switch on what your team needs.",
    },
    {
      key: "device",
      question: "Do employees need a separate device?",
      answer:
        "No. Employees use the Fenzit app on their own phones and sign in with a phone-number OTP. Attendance is verified by GPS against your office location, so there is no biometric machine to buy.",
    },
    {
      key: "offline",
      question: "Does Fenzit work offline?",
      answer:
        "Not yet. Employees need a mobile connection to receive jobs, update status and mark attendance.",
    },
    {
      key: "access",
      question: "How do I get access?",
      answer:
        "Fenzit is in early access. Join the early access list, and we will email you as access opens.",
    },
  ],
};
