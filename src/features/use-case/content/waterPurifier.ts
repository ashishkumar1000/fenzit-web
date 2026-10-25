import { CalendarDays, Send, Camera, FileText } from "lucide-react";
import { WATER_PURIFIER_PAGE } from "../../../app/pageMeta";
import { WaterPurifierArt } from "../art/WaterPurifierArt";
import type { UseCaseContent } from "../components/UseCasePage";

export const WATER_PURIFIER_CONTENT: UseCaseContent = {
  meta: WATER_PURIFIER_PAGE,
  art: WaterPurifierArt,
  shortLabel: "RO service",
  heading: "Run every RO service visit with proof, from booking to signature",
  lead: "Fenzit is a phone-first app for RO and water purifier service teams. Create AMC visits, send them to technicians with steps and directions, and get photos and the customer's signature back as proof.",
  problemHeading: "The AMC diary forgets visits, and complaints reach you last",
  problem: [
    "AMC visits are remembered by hand, and a filter change slips by until the customer calls to ask where the technician is.",
    "The technician says the filter was changed, but there is no photo or signature to prove it when the client asks.",
    "A complaint about water taste or a leak reaches you after the customer has already called twice.",
  ],
  stepsHeading: "How an RO service visit runs in Fenzit",
  steps: [
    {
      key: "create",
      icon: CalendarDays,
      title: "Create the AMC visit",
      text: "Pick the saved client with its address and map pin, and note what the visit covers: a new installation, a filter change, or dispenser servicing.",
    },
    {
      key: "assign",
      icon: Send,
      title: "Assign by skill or area",
      text: "The visit reaches the right technician's phone with the steps to follow and one-tap directions to the client's door.",
    },
    {
      key: "proof",
      icon: Camera,
      title: "Live status and proof",
      text: "Status updates live on your phone while the visit happens, and photos of the changed filter and the customer's signature come back with the job.",
    },
    {
      key: "reports",
      icon: FileText,
      title: "Service reports per client",
      text: "Download PDF reports of the visits to review the month, or share a client's service record with them.",
    },
  ],
  faq: [
    {
      key: "reminders",
      question: "Does Fenzit remind me when an AMC visit is due?",
      answer:
        "Not yet. You create the AMC visits yourself, and each technician sees the day's list on their phone. There is no automatic reminder from a due date.",
    },
    {
      key: "proof",
      question: "How do I know the filter was actually changed?",
      answer:
        "The technician adds photos of the work at the visit, and the customer's signature goes on the job as proof. You see the finished job with its photos on your phone, not just a message saying it is done.",
    },
    {
      key: "signature",
      question: "Does the customer sign on the phone?",
      answer:
        "Yes. At the end of the visit, the customer signs on the technician's own phone screen, and the signature is saved with the job along with the photos.",
    },
    {
      key: "attendance",
      question: "Can I watch my technicians' attendance in the same app?",
      answer:
        "Yes. Technicians check in from their own phones, and Fenzit verifies the check-in against your office location. You see who is in today and can pull a monthly attendance report.",
    },
    {
      key: "spares",
      question: "Can technicians record the filters and spares they use?",
      answer:
        "Not yet. Fenzit records the visit, the photos and the signature, but it does not track inventory or spare parts. You would note the parts used outside the app.",
    },
  ],
};
