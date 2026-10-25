import { Camera, ClipboardList, Send, Zap } from "lucide-react";
import { ELECTRICIAN_PAGE } from "../../../app/pageMeta";
import { ElectricianArt } from "../art/ElectricianArt";
import type { UseCaseContent } from "../components/UseCasePage";

export const ELECTRICIAN_CONTENT: UseCaseContent = {
  meta: ELECTRICIAN_PAGE,
  art: ElectricianArt,
  shortLabel: "Electricians",
  heading: "Run every electrician job from the first call to the finished fitting",
  lead: "Fenzit is a phone-first app for electricians and electrical contractors. Create fitting and wiring jobs, send them to your electricians with one-tap directions, and watch each job's status change live on your phone.",
  problemHeading: "Phone calls and memory can't tell you which fitting was done where",
  problem: [
    "Jobs arrive as phone calls, get repeated to the electrician, and the small fitting jobs are the first to be forgotten.",
    "The customer asks which fan or light was fitted, and the answer depends on whoever remembers the visit.",
    "When the month ends, there is no record of what was finished, where, and for which customer.",
  ],
  stepsHeading: "How an electrical job runs in Fenzit",
  steps: [
    {
      key: "create",
      icon: ClipboardList,
      title: "Create the job",
      text: "Choose the skill — fans and lights, wiring faults, panel work — and the saved customer with its address and map pin.",
    },
    {
      key: "assign",
      icon: Send,
      title: "Assign the electrician",
      text: "The job reaches their phone with the steps to follow and one-tap directions to the house, shop or factory.",
    },
    {
      key: "status",
      icon: Zap,
      title: "Live status from the site",
      text: "The status changes on your phone as the work moves, so you know which visit has started and which is finished without calling.",
    },
    {
      key: "proof",
      icon: Camera,
      title: "Proof and reports",
      text: "Photos of the finished fittings and the customer's signature come back with the job, and PDF reports keep the month on record.",
    },
  ],
  faq: [
    {
      key: "urgent",
      question: "What about urgent calls that come in during the day?",
      answer:
        "Create the job on the spot — the customer is already saved with its address and map pin — and assign an electrician. It reaches their phone straight away with the steps and the directions, the same as a job planned the night before.",
    },
    {
      key: "directions",
      question: "How do my electricians find the address?",
      answer:
        "Every job carries the saved customer's address, and the app gives one-tap directions to it. Even a new electrician reaches the flat or shop without you reading the address out over the phone.",
    },
    {
      key: "proof",
      question: "How do I know the fitting was actually done?",
      answer:
        "The electrician adds photos of the finished work at the job, and the customer signs on the phone. The finished status, the photos and the signature stay with the job, so you can see what was done and where.",
    },
    {
      key: "reports",
      question: "Can I see the month's work in one place?",
      answer:
        "Yes. Pull PDF reports for jobs and attendance whenever you need them — which jobs were finished, for which customer, and who checked in where. The month's numbers are ready without a notebook.",
    },
    {
      key: "spares",
      question: "Does Fenzit track wires, switches and spare parts?",
      answer:
        "Not yet. Fenzit records the job, its live status, the photos and the customer's signature. Keeping a stock of materials against each job is not part of it, so note the material used another way for now.",
    },
  ],
};
