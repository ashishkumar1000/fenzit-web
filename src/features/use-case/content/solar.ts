import { FileText, MapPin, Send, Sun } from "lucide-react";
import { SOLAR_PAGE } from "../../../app/pageMeta";
import { SolarArt } from "../art/SolarArt";
import type { UseCaseContent } from "../components/UseCasePage";

export const SOLAR_CONTENT: UseCaseContent = {
  meta: SOLAR_PAGE,
  art: SolarArt,
  shortLabel: "Solar installers",
  heading: "Track every rooftop solar job live, from survey to handover",
  lead: "Fenzit is a phone-first app for solar installation companies. Create the survey and the installation as jobs, send them to your crew with clear steps, and watch each rooftop's status change live on your phone.",
  problemHeading: "WhatsApp galleries and one crew leader's memory can't run your rooftops",
  problem: [
    "Survey photos sit buried in a WhatsApp gallery, and nobody can find the roof shot they need later.",
    "An installation runs across days, and its progress lives only in the crew leader's head.",
    "The array is switched on, and there is no clean handover record to leave with the customer.",
  ],
  stepsHeading: "How a rooftop job runs in Fenzit",
  steps: [
    {
      key: "survey",
      icon: MapPin,
      title: "Start with the survey job",
      text: "The engineer gets the site's address and map pin, photographs the roof, and notes the structure. The photos stay on the job, not in a gallery.",
    },
    {
      key: "assign",
      icon: Send,
      title: "Assign the install crew",
      text: "Send the job to the crew: the job's steps and the site pin reach their phones, with one-tap directions to the rooftop.",
    },
    {
      key: "days",
      icon: Sun,
      title: "Follow the days live",
      text: "The crew works through mounting, wiring, and commissioning as steps on the job, and the status changes on your phone across the days.",
    },
    {
      key: "report",
      icon: FileText,
      title: "Hand over with a report",
      text: "The job closes with photos of the finished array and the customer's signature, and you download it all as a PDF report for the customer.",
    },
  ],
  faq: [
    {
      key: "attendance",
      question: "How does crew attendance work?",
      answer:
        "Attendance is marked on each employee's own phone and verified by GPS against the office locations you set, such as your office or store. You see a live daily view of who is in, and monthly attendance reports come as PDFs. Check-ins are tied to those locations, not to the rooftop itself.",
    },
    {
      key: "multiday",
      question: "Can a job run across several days?",
      answer:
        "Yes. A rooftop installation stays open until it is finished. The crew updates the status as each stage completes, so mounting reads differently from wiring, and you can see how far each roof has reached.",
    },
    {
      key: "proof",
      question: "What proof do we hand the customer?",
      answer:
        "Photos of the finished array and the customer's signature are collected on the job itself. Download the job's PDF report and hand it over as the completion record.",
    },
    {
      key: "reports",
      question: "Do we get reports for the month?",
      answer:
        "Yes. Fenzit keeps PDF reports for jobs and for attendance, so month-end is a download, not a hunt through WhatsApp galleries.",
    },
    {
      key: "notyet",
      question: "Does Fenzit plan routes between rooftops or track spare parts?",
      answer:
        "Not yet. Fenzit does not plan routes, track inventory, or monitor generation. It tracks the jobs themselves: who has each survey or installation, where it stands, and the proof when it is done.",
    },
  ],
};
