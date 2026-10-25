import { Camera, ClipboardList, Send, Video } from "lucide-react";
import { CCTV_PAGE } from "../../../app/pageMeta";
import { CctvArt } from "../art/CctvArt";
import type { UseCaseContent } from "../components/UseCasePage";

export const CCTV_CONTENT: UseCaseContent = {
  meta: CCTV_PAGE,
  art: CctvArt,
  shortLabel: "CCTV installers",
  heading: "Track every CCTV installation job, from cabling to signed handover",
  lead: "Fenzit is a phone-first app for CCTV and security-camera installers. Create installation and service jobs, send them to your installers with the camera positions as steps, and get photos and the customer's signature back from site.",
  problemHeading: "The jobs live in WhatsApp, and the camera positions live in memory",
  problem: [
    "Installation and service calls arrive as WhatsApp messages, and by evening the day's list is jumbled.",
    "There is no photo record of where each camera was mounted, so every revisit starts with a search.",
    "You hear about an unfinished site only when the customer calls to ask why the cameras are still dead.",
  ],
  stepsHeading: "How a CCTV installation runs in Fenzit",
  steps: [
    {
      key: "create",
      icon: ClipboardList,
      title: "Create the installation job",
      text: "Pick the saved customer with the site address and map pin, and put the camera positions in the steps: gate, godown, counter.",
    },
    {
      key: "assign",
      icon: Send,
      title: "Assign your installers",
      text: "The job reaches their phones with the camera positions to follow and one-tap directions to the site.",
    },
    {
      key: "track",
      icon: Video,
      title: "Follow live status across the day",
      text: "Cabling, mounting and testing are separate steps, so you can see from your phone which cameras are up and what is still open.",
    },
    {
      key: "proof",
      icon: Camera,
      title: "Hand over with proof",
      text: "The installer adds photos of each mounted camera, and the customer signs on the phone, so the handover is on record.",
    },
  ],
  faq: [
    {
      key: "multiday",
      question: "Big shop installations take us three days. Does a job have to finish in one day?",
      answer:
        "No. The job stays open until every step is marked finished, so a three-day fit-out shows one clear status the whole way instead of a fresh WhatsApp thread each morning.",
    },
    {
      key: "positions",
      question: "Can I check where each camera was mounted?",
      answer:
        "Yes. Photos of each mounted camera are added to the job, so when a customer asks about the camera above the godown door a year later, the answer is in the job, not in anyone's memory.",
    },
    {
      key: "portal",
      question: "Do customers get an app or portal to watch their cameras?",
      answer:
        "No — Fenzit is for your team. It runs the installation and service jobs; the customer's live feed stays on their DVR or NVR.",
    },
    {
      key: "service",
      question: "What about a service call when a camera dies?",
      answer:
        "Create a service job the same way. The customer is already saved, the job photos show where the camera was mounted, and your technician gets the visit with steps and directions.",
    },
    {
      key: "stock",
      question: "Does Fenzit track the DVRs, cables and spares we carry?",
      answer:
        "Not yet. Fenzit tracks jobs, attendance and proof of work, not stock, so keep your spare-part list where it lives today.",
    },
  ],
};
