import { CalendarDays, Send, Laptop, FileText } from "lucide-react";
import { IT_AMC_PAGE } from "../../../app/pageMeta";
import { ItAmcArt } from "../art/ItAmcArt";
import type { UseCaseContent } from "../components/UseCasePage";

export const IT_AMC_CONTENT: UseCaseContent = {
  meta: IT_AMC_PAGE,
  art: ItAmcArt,
  shortLabel: "IT AMC teams",
  heading: "Keep every AMC visit on schedule, with a signed report to prove it",
  lead: "Fenzit is a phone-first app for IT and computer service teams. Plan this month's AMC visits, send each round to your engineers, and close every visit with photos and the client's signature.",
  problemHeading: "The AMC diary keeps slipping, and no visit leaves proof",
  problem: [
    "AMC dates sit in a diary or an Excel sheet, and a visit slips past without anyone noticing.",
    "The engineer services the machines, but there is no signed record of what was checked or fixed.",
    "A client questions whether the visit happened, and there is nothing to show.",
  ],
  stepsHeading: "How an AMC round runs in Fenzit",
  steps: [
    {
      key: "schedule",
      icon: CalendarDays,
      title: "Schedule the AMC visits",
      text: "Create this month's visits client by client in one sitting, each job carrying the client's address and map pin.",
    },
    {
      key: "assign",
      icon: Send,
      title: "Assign the engineer",
      text: "The visit lands on the engineer's phone with the steps to follow and one-tap directions to the client's office.",
    },
    {
      key: "track",
      icon: Laptop,
      title: "Track each service live",
      text: "Status updates reach your phone as the round moves office to office, with photos coming back from each visit.",
    },
    {
      key: "reports",
      icon: FileText,
      title: "Signed service reports",
      text: "Each visit closes with photos and the client's signature, and PDF reports keep the month's AMC at a glance.",
    },
  ],
  faq: [
    {
      key: "inventory",
      question: "Can Fenzit keep our asset and inventory records?",
      answer:
        "Not yet. Fenzit does not track inventory or spare parts. It runs the field side — the visits, the engineers, and the proof of what was serviced.",
    },
    {
      key: "remote",
      question: "We fix many issues over remote sessions. Can Fenzit log those?",
      answer:
        "No. Fenzit runs the field visits — the trips to client offices and the proof they happened. It is not a remote-support tool.",
    },
    {
      key: "proof",
      question: "How do I prove a visit happened?",
      answer:
        "The engineer adds photos of the serviced machines, and the client signs on the phone at the visit. The signed job report is the record you keep.",
    },
    {
      key: "monthly",
      question: "Can I see the whole month at a glance?",
      answer:
        "Yes. Every visit is a job with its live status, and you can pull PDF reports for jobs and attendance to review the month's rounds with each client.",
    },
    {
      key: "phone",
      question: "Do engineers need a computer for Fenzit?",
      answer:
        "No. Engineers sign in to the Fenzit app on their own phone with a phone-number OTP and see the day's visits, the steps for each, and directions to the office.",
    },
  ],
};
