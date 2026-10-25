import { CalendarDays, Camera, FileText, Send } from "lucide-react";
import { PEST_CONTROL_PAGE } from "../../../app/pageMeta";
import { PestControlArt } from "../art/PestControlArt";
import type { UseCaseContent } from "../components/UseCasePage";

export const PEST_CONTROL_CONTENT: UseCaseContent = {
  meta: PEST_CONTROL_PAGE,
  art: PestControlArt,
  shortLabel: "Pest control",
  heading: "Keep every pest control visit on time, with proof of treatment",
  lead: "Fenzit is a phone-first app for pest control teams. Create each visit as a job, send it to your technician with the steps to follow, and get photos and the customer's signature back from the site.",
  problemHeading: "The visit diary can't tell you which rooms were treated",
  problem: [
    "Contract visits are ticked off in a paper diary, and a busy week lets a follow-up slip past its date.",
    "A client asks which rooms were treated, and all you have to show is a tick in the diary.",
    "The technician has been out since morning, and you have to call him between visits to know where he has reached.",
  ],
  stepsHeading: "How a pest control visit runs in Fenzit",
  steps: [
    {
      key: "schedule",
      icon: CalendarDays,
      title: "Schedule the visits",
      text: "Create a job for each visit — a termite treatment at a site or this month's services for a contract client — with the address and map pin saved.",
    },
    {
      key: "assign",
      icon: Send,
      title: "Assign the technician",
      text: "The job reaches your technician's phone with the steps to follow and one-tap directions to the client's address.",
    },
    {
      key: "record",
      icon: Camera,
      title: "Record the treatment",
      text: "Status updates live as the visit runs. The technician adds photos from the site, and the customer signs on his phone as proof of treatment.",
    },
    {
      key: "followups",
      icon: FileText,
      title: "Keep follow-ups on time",
      text: "Each morning the technician sees his visit list on the phone, and you download PDF reports of the jobs to keep every contract's record straight.",
    },
  ],
  faq: [
    {
      key: "proof",
      question: "What proof of treatment can I show a client?",
      answer:
        "The technician adds photos of the treated areas during the visit, and the customer signs on his phone at the end. The job's PDF report keeps all of it together, so a client who asks what was treated gets an answer, not a promise.",
    },
    {
      key: "followups",
      question: "Does Fenzit create follow-up visits automatically?",
      answer:
        "Not yet. A termite job's check-up after a year or a contract's next service does not repeat on its own — you create the follow-up job when the visit closes. The morning visit list then keeps it in front of the technician.",
    },
    {
      key: "steps",
      question: "Does the technician know what treatment to do?",
      answer:
        "Yes. Each job carries the steps to follow, so a pre-construction termite job and a bedbug service at a home can each carry their own list. The technician follows the steps and updates the job's status live as he goes.",
    },
    {
      key: "route",
      question: "Does Fenzit plan the technician's route for the day?",
      answer:
        "Not yet. Every job comes with one-tap directions to the client's address, but the order of the visits is yours to set. There is no route optimisation, and no live map of the technician through the day.",
    },
    {
      key: "device",
      question: "Do technicians need to carry a separate device?",
      answer:
        "No. The Fenzit app runs on the technician's own phone, signed in with a phone-number OTP. The steps, the photos, the customer's signature and the status updates all go through that one phone.",
    },
  ],
};
