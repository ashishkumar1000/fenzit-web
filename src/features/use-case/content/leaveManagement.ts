import { Bell, CheckCircle2, FileText, Smartphone } from "lucide-react";
import { LEAVE_MANAGEMENT_PAGE } from "../../../app/pageMeta";
import { LeaveManagementArt } from "../art/LeaveManagementArt";
import type { UseCaseContent } from "../components/UseCasePage";

export const LEAVE_MANAGEMENT_CONTENT: UseCaseContent = {
  meta: LEAVE_MANAGEMENT_PAGE,
  art: LeaveManagementArt,
  shortLabel: "Leave management",
  heading: "Leave requests and approvals on your phone, without the chits and calls",
  lead: "Fenzit is a phone-first app for field-service businesses. Employees apply for leave from their phones, you approve from yours, and every request lands in the record next to attendance.",
  problemHeading: "Leave decided on calls and sticky notes never becomes a record",
  problem: [
    "Leave is asked on a phone call or a sticky note, and the request itself gets lost on the way.",
    "Nobody remembers who took how many days, so the same counting starts again every month.",
    "The register says one thing and the team remembers another, and the two never settle.",
  ],
  stepsHeading: "How leave runs in Fenzit",
  steps: [
    {
      key: "apply",
      icon: Smartphone,
      title: "The employee applies",
      text: "From the Fenzit app on their own phone: the dates and a reason, sent to you in a tap.",
    },
    {
      key: "request",
      icon: Bell,
      title: "The request reaches you",
      text: "It arrives in the app, next to the day's attendance, so you can see who is in before you decide.",
    },
    {
      key: "approve",
      icon: CheckCircle2,
      title: "You approve",
      text: "One tap on your phone and the day is marked. No follow-up call, no note to copy into the register.",
    },
    {
      key: "record",
      icon: FileText,
      title: "The record stays",
      text: "Leave sits next to attendance in the monthly report, so who took how many days is on the PDF, not in memory.",
    },
  ],
  faq: [
    {
      key: "where",
      question: "Where do I approve leave?",
      answer:
        "In the Fenzit app, next to the day's attendance. You see who is in and who has asked for leave in the same place, and one tap approves the request and marks the day.",
    },
    {
      key: "status",
      question: "Do employees see the status of a request?",
      answer:
        "Yes. The request lives in the Fenzit app on the employee's own phone, so they can open it and see where it stands instead of calling you to ask.",
    },
    {
      key: "separate",
      question: "Can we use leave without the jobs side?",
      answer:
        "Yes. Leave and attendance are switched on separately from jobs. A business can run attendance and leave without creating a single job.",
    },
    {
      key: "app",
      question: "Do employees need an app?",
      answer:
        "Yes. Employees sign in to the Fenzit app on their own phone with a phone-number OTP and apply for leave from there. There is no extra device to buy or manage.",
    },
    {
      key: "halfday",
      question: "Does Fenzit handle half-days?",
      answer:
        "Not yet. Today leave is counted by the day: the request, the approval and a clear record next to attendance. Half-day rules are not in the app.",
    },
  ],
};
