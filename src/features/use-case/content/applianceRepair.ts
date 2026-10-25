import { Camera, ClipboardList, MapPin, Send } from "lucide-react";
import { APPLIANCE_REPAIR_PAGE } from "../../../app/pageMeta";
import { ApplianceRepairArt } from "../art/ApplianceRepairArt";
import type { UseCaseContent } from "../components/UseCasePage";

export const APPLIANCE_REPAIR_CONTENT: UseCaseContent = {
  meta: APPLIANCE_REPAIR_PAGE,
  art: ApplianceRepairArt,
  shortLabel: "Appliance repair",
  heading: "Run every appliance repair visit, from the first call to the signed proof",
  lead: "Fenzit is a phone-first app for field-service businesses. Book a washing machine or fridge repair as a job, send it to the right technician's phone, and get photos and the customer's signature back as proof of the repair.",
  problemHeading: "Calls and WhatsApp cannot tell you which repair is done",
  problem: [
    "Repair requests arrive by call, by WhatsApp and from memory, and the machine's fault gets retold differently every time.",
    "By evening you cannot say which technician finished which visit without ringing each one.",
    "When the customer rings about the warranty, there is no record of what was repaired, when, or who signed for it.",
  ],
  stepsHeading: "How Fenzit runs an appliance repair visit",
  steps: [
    {
      key: "book",
      icon: ClipboardList,
      title: "Book the visit as a job",
      text: "Choose the saved customer with its address and map pin, and write the appliance into the job's steps — a washing machine that will not spin, a fridge that is not cooling, a dead microwave.",
    },
    {
      key: "assign",
      icon: Send,
      title: "Assign the technician",
      text: "Pick a technician whose skill matches the machine, and the job reaches their phone with the steps to follow and one-tap directions to the customer's home.",
    },
    {
      key: "track",
      icon: MapPin,
      title: "Follow live status",
      text: "Watch each job move live from leaving to finishing at the customer's home, with location recorded at the steps that need it.",
    },
    {
      key: "proof",
      icon: Camera,
      title: "Close with proof",
      text: "The technician adds a photo of the repaired unit and the customer signs on the phone, so every closed job carries its own record.",
    },
  ],
  faq: [
    {
      key: "spares",
      question: "Does Fenzit track spare parts and consumables?",
      answer:
        "Not yet — Fenzit does not track inventory. The job keeps the photos and the steps of the repair; the parts you carry stay in your own stock register.",
    },
    {
      key: "doorstep",
      question: "Does it work for doorstep visits to customers' homes?",
      answer:
        "Yes. Every job carries the saved address and map pin, the technician gets one-tap directions, and the steps that need it record the technician's location at the home.",
    },
    {
      key: "warranty",
      question: "What proof do I keep for the warranty file?",
      answer:
        "Each job closes with a photo of the repaired unit and the customer's signature, and you can download the job's PDF report. When the customer rings about a repeat fault, the earlier visit has its own record.",
    },
    {
      key: "phones",
      question: "Do technicians need a separate device?",
      answer:
        "No. Technicians sign in to the Fenzit app on their own phones with a phone-number OTP and see today's jobs and the steps for each one. There is no extra device to buy or manage.",
    },
    {
      key: "repeat",
      question: "Can a warranty follow-up visit be scheduled automatically?",
      answer:
        "Not yet — Fenzit does not create recurring jobs. Book the follow-up the same way as the first visit: one job, the right technician, and proof when it is done.",
    },
  ],
};
