import { ClipboardList, MapPin, Send, UserCheck } from "lucide-react";
import { FIELD_TRACKING_PAGE } from "../../../app/pageMeta";
import { JobTrackingArt } from "../art/UseCaseArt";
import type { UseCaseContent } from "../components/UseCasePage";

export const FIELD_TRACKING_CONTENT: UseCaseContent = {
  meta: FIELD_TRACKING_PAGE,
  art: JobTrackingArt,
  heading: "Track every field job live, from dispatch to done",
  lead: "Fenzit is a phone-first app for Indian field-service businesses. Create jobs, send them to employees with clear steps, and watch each job's status change live on your phone.",
  problemHeading: "The register and WhatsApp can't tell you where a job stands",
  problem: [
    "Jobs are written in a register or typed out on WhatsApp, and details get lost on the way.",
    "Nobody knows if a job has started, finished, or is stuck until someone picks up the phone.",
    "A customer asks for status, and you have to call your employee before you can answer.",
  ],
  stepsHeading: "How a job runs in Fenzit",
  steps: [
    {
      key: "create",
      icon: ClipboardList,
      title: "Create the job",
      text: "Choose a skill, a saved customer with its address and map pin, and the employees for the work.",
    },
    {
      key: "assign",
      icon: Send,
      title: "Assign with steps",
      text: "Employees get the job on their phones with the steps to follow and one-tap directions to the site.",
    },
    {
      key: "track",
      icon: MapPin,
      title: "Track it live",
      text: "Status updates on your phone as it happens, location is recorded at the steps that need it, and photos and the customer's signature come back with the job.",
    },
    {
      key: "reports",
      icon: UserCheck,
      title: "Close with reports",
      text: "Download PDF reports for jobs and attendance to review the week or share the month's numbers.",
    },
  ],
  faq: [
    {
      key: "app",
      question: "Do employees need an app?",
      answer:
        "Yes. Employees sign in to the Fenzit app on their own phone with a phone-number OTP and see today's jobs and the steps for each one. There is no extra device to buy or manage.",
    },
    {
      key: "live",
      question: 'What does "live tracking" mean in Fenzit?',
      answer:
        "You see each job's status change live, and Fenzit records the employee's location and distance from the job site at the steps that need it. It is not a live map of employee movement through the day.",
    },
    {
      key: "assign",
      question: "How do employees get their jobs?",
      answer:
        "When you create a job, employees get a live notification with a link to it. The job shows the work for today and the steps to follow, with one-tap directions to the customer's address.",
    },
    {
      key: "proof",
      question: "How do I know the work was actually done?",
      answer:
        "Employees add photos and the customer's signature at the job, and the job's status shows as finished. You can also pull PDF reports for jobs and attendance whenever you need them.",
    },
  ],
  siblings: [
    { to: "/ac-service-software", label: "AC service teams" },
    { to: "/plumber-software", label: "Plumbers" },
    { to: "/delivery-tracking", label: "Delivery teams" },
    { to: "/collection-agent-tracking", label: "Collection agents" },
  ],
};
