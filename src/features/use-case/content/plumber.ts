import { Camera, ClipboardList, MapPin, Smartphone } from "lucide-react";
import { PLUMBER_PAGE } from "../../../app/pageMeta";
import { PlumberArt } from "../art/UseCaseArt";
import type { UseCaseContent } from "../components/UseCasePage";

export const PLUMBER_CONTENT: UseCaseContent = {
  meta: PLUMBER_PAGE,
  art: PlumberArt,
  shortLabel: "Plumbers",
  heading: "Plumbing job management for teams of 2 to 20",
  lead: "Fenzit puts every plumbing job, from tank cleaning to bathroom fitting, in one list on your phone. You assign, your plumbers update from the site, and you see the status live.",
  problemHeading: "Why calls and a diary stop working",
  problem: [
    "You call each plumber through the day to ask where he reached.",
    "Jobs noted in a diary get missed when the day gets busy.",
    "A customer questions the work and you have no photo or signature to show him.",
  ],
  stepsHeading: "How Fenzit works",
  steps: [
    {
      key: "customer",
      icon: MapPin,
      title: "Save the customer",
      text: "Add the customer once with an address search and a map pin, so directions to the site are one tap away.",
    },
    {
      key: "assign",
      icon: ClipboardList,
      title: "Assign by skill",
      text: "Create the job and give it to a plumber whose skills match the work, like pump repair or tank cleaning.",
    },
    {
      key: "steps",
      icon: Smartphone,
      title: "Follow the steps",
      text: "Your plumber sees today's jobs, works through the steps for each, and adds photos of the finished work plus the customer's signature.",
    },
    {
      key: "live",
      icon: Camera,
      title: "See status live",
      text: "The job moves from scheduled to in progress to done on your phone as it happens, and the report stays saved as a PDF.",
    },
  ],
  faq: [
    {
      key: "own",
      question: "Does the plumber see only his own jobs?",
      answer:
        "Yes. Each plumber signs in with his phone number and sees his jobs for today, with the steps for each one.",
    },
    {
      key: "proof",
      question: "Can I prove the work was finished?",
      answer:
        "Yes. The plumber adds photos of the finished work and the customer signs on his phone, and you keep the report as a PDF.",
    },
    {
      key: "map",
      question: "Can I see my plumber on a live map?",
      answer:
        "No. Fenzit does not show a live map of plumber movement. When a step records location, you can see how far the plumber is from the site, and job status updates reach you live.",
    },
    {
      key: "attendance",
      question: "Can it also track attendance and leave?",
      answer:
        "Yes. Fenzit covers jobs, attendance and leave in one app, so you do not keep a separate register for your plumbers.",
    },
  ],
};
