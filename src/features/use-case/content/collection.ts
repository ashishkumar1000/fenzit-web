import { ClipboardList, FileText, MapPin, UserCheck } from "lucide-react";
import { COLLECTION_PAGE } from "../../../app/pageMeta";
import { CollectionArt } from "../art/UseCaseArt";
import type { UseCaseContent } from "../components/UseCasePage";

export const COLLECTION_CONTENT: UseCaseContent = {
  meta: COLLECTION_PAGE,
  art: CollectionArt,
  shortLabel: "Collection agents",
  heading: "Track collection agents with proof of every visit",
  lead: "Fenzit is built for Indian collection and field teams. Each visit becomes a job with an address, you see live status, and location is recorded at the visit itself.",
  problemHeading: "Field visits you have to take on trust",
  problem: [
    "Did the agent actually visit? Today you have only their word for it.",
    "Visits claimed on call or in a diary, with nothing to check them against.",
    "Attendance of field staff unknown, because they start from the field, not your office.",
  ],
  stepsHeading: "How field visit tracking works",
  steps: [
    {
      key: "plan",
      icon: ClipboardList,
      title: "Plan the day",
      text: "Create each visit or collection as a job with a customer, an address and a map pin.",
    },
    {
      key: "assign",
      icon: UserCheck,
      title: "Assign to agents",
      text: "Assign the jobs to your employees; each agent sees today's visits, with one-tap directions to the address.",
    },
    {
      key: "proof",
      icon: MapPin,
      title: "Proof at the visit",
      text: "Location is recorded at the steps that need it, with a photo on the spot, and you see the agent's distance from the address.",
    },
    {
      key: "records",
      icon: FileText,
      title: "Live status, records",
      text: "Job status updates live — scheduled, in progress, done — and you get PDF reports for your records.",
    },
  ],
  faq: [
    {
      key: "visited",
      question: "How do I know the agent actually visited?",
      answer:
        "Location is recorded at the steps of the visit that need it, and the agent takes a photo on the spot. You can also see the agent's distance from the visit address.",
    },
    {
      key: "attendance",
      question: "Can I track attendance of my field agents?",
      answer:
        "Yes. Agents mark attendance with a GPS-verified check-in at your office locations, and leave requests and approvals are in the same app.",
    },
    {
      key: "cash",
      question: "Does Fenzit handle cash collected or show a live map of agents?",
      answer:
        "No. It records that the visit happened — location at the visit steps and a photo on the spot — not cash amounts, receipts or continuous movement.",
    },
    {
      key: "needs",
      question: "What do my agents need to use Fenzit?",
      answer:
        "A smartphone and their phone number — sign-in is by OTP. Updates appear live, and each company sees only its own data.",
    },
  ],
};
