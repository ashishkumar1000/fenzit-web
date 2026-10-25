import { Building2, ClipboardList, FileText, UserCheck } from "lucide-react";
import { FACILITY_MANAGEMENT_PAGE } from "../../../app/pageMeta";
import { FacilityManagementArt } from "../art/FacilityManagementArt";
import type { UseCaseContent } from "../components/UseCasePage";

export const FACILITY_MANAGEMENT_CONTENT: UseCaseContent = {
  meta: FACILITY_MANAGEMENT_PAGE,
  art: FacilityManagementArt,
  shortLabel: "Facility teams",
  heading: "Run site teams across buildings, from the morning check-in to the last round",
  lead: "Fenzit is a phone-first app for facility management companies. Mark every building as a site, see who has checked in where, and follow each supervisor's round as it happens.",
  problemHeading: "Attendance sheets and phone calls can't show you the day across your buildings",
  problem: [
    "Attendance sheets are collected from each building by hand, and the picture comes together a day late.",
    "Supervisors report that the rounds are done, but there is nothing to show which floors were actually visited.",
    "Leave is approved on phone calls, and the dates or the reason are forgotten by month end.",
  ],
  stepsHeading: "How a site day runs in Fenzit",
  steps: [
    {
      key: "sites",
      icon: Building2,
      title: "Mark each site as a location",
      text: "Add every building you serve as a location, so each one becomes its own check-in point for the housekeeping and security staff posted there.",
    },
    {
      key: "attendance",
      icon: UserCheck,
      title: "Attendance at the right site",
      text: "Staff check in from their own phones, verified against the building they are posted at, and the daily view shows who is in and where.",
    },
    {
      key: "rounds",
      icon: ClipboardList,
      title: "Daily rounds as jobs",
      text: "Set the round up as a job with its steps, and supervisors tick each step and add photo proof from the floors as they go.",
    },
    {
      key: "reports",
      icon: FileText,
      title: "Leave and monthly reports",
      text: "Approve leave in the app, then download the month's PDF reports for attendance and jobs to share with each building client.",
    },
  ],
  faq: [
    {
      key: "sites",
      question: "We manage several buildings. Does Fenzit handle more than one site?",
      answer:
        "Yes. Add each building as its own location, and staff check in at the one they are posted at. The daily view separates the sites, so you can see who is in at every building without a single phone call.",
    },
    {
      key: "biometric",
      question: "Do we need biometric devices at every building?",
      answer:
        "No — staff use their own phones. They sign in to the Fenzit app with a phone-number OTP and check in from there, so there is no device to buy, install or repair at any site.",
    },
    {
      key: "hours",
      question: "Our shifts differ from building to building. What about working hours?",
      answer:
        "Set the working hours for each team, and attendance is checked against them. The daily view shows who has reported and who has not, and the monthly report carries the same numbers.",
    },
    {
      key: "clients",
      question: "Can we send reports to the building clients?",
      answer:
        "Yes. Download PDF reports for attendance and jobs and share the month's numbers with each client. It is a proper document, not a photo of a register.",
    },
    {
      key: "map",
      question: "Can we watch staff move on a live map through the day?",
      answer:
        "Not yet. Fenzit shows each round's status live and records the location at the steps that need it. It is not a live map of a guard's movement between checkpoints.",
    },
  ],
};
