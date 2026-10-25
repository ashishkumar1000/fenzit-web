import { BadgeCheck, ClipboardList, MapPin, Send } from "lucide-react";
import { TECHNICIAN_TRACKING_PAGE } from "../../../app/pageMeta";
import { TechnicianTrackingArt } from "../art/TechnicianTrackingArt";
import type { UseCaseContent } from "../components/UseCasePage";

export const TECHNICIAN_TRACKING_CONTENT: UseCaseContent = {
  meta: TECHNICIAN_TRACKING_PAGE,
  art: TechnicianTrackingArt,
  shortLabel: "Technicians",
  heading: "Assign every job to the right technician and follow it to the signed proof",
  lead: "Fenzit is a phone-first app for Indian field-service businesses. Create each service or repair job with the skill it needs, send it to a technician's phone, and get live status, photos and the customer's signature back as proof of the work.",
  problemHeading: "Phone calls cannot run technicians spread across the city",
  problem: [
    "Jobs reach your technicians as phone calls, and the fault changes with every retelling.",
    "Your technicians are spread across the city, and you ring each one through the day to ask where the job has reached.",
    "When the customer asks whether the repair is done, you have no photo or signature to show.",
  ],
  stepsHeading: "How a technician's job runs in Fenzit",
  steps: [
    {
      key: "create",
      icon: ClipboardList,
      title: "Create the job",
      text: "Choose the skill the job needs and the saved customer with its address and map pin, and write the fault into the job's steps.",
    },
    {
      key: "assign",
      icon: Send,
      title: "Assign the right technician",
      text: "Pick a technician whose skill matches the work, and the job reaches his phone with the steps to follow and one-tap directions to the site.",
    },
    {
      key: "track",
      icon: MapPin,
      title: "Follow status live",
      text: "The job's status changes on your phone as it happens, and location is recorded at the steps that need it — no calls through the day.",
    },
    {
      key: "proof",
      icon: BadgeCheck,
      title: "Proof of the work",
      text: "The technician adds photos of the finished work and the customer signs on his phone, and PDF reports keep the month's jobs on record.",
    },
  ],
  faq: [
    {
      key: "live",
      question: "Can I see my technicians on a live map?",
      answer:
        "You see each job's status change live, and Fenzit records the technician's location and distance from the site at the steps that need it. It is not a live map of technician movement through the day.",
    },
    {
      key: "directions",
      question: "How does the technician find the site?",
      answer:
        "The job carries the saved customer's address and map pin, and the technician gets one-tap directions on his phone. He does not ring the office for the address.",
    },
    {
      key: "phones",
      question: "Do technicians need a separate device?",
      answer:
        "No. Technicians sign in to the Fenzit app on their own phones with a phone-number OTP and see today's jobs and the steps for each one. There is no extra device to buy or manage.",
    },
    {
      key: "routes",
      question: "Can Fenzit plan the day's route for each technician?",
      answer:
        "Not yet — Fenzit does not optimise routes. You choose the jobs and the technicians; each technician sees his own jobs for the day, with one-tap directions to each site.",
    },
    {
      key: "reports",
      question: "What do I get at the end of the month?",
      answer:
        "Download PDF reports for jobs and attendance. Each finished job keeps its photos and the customer's signature, and the attendance report shows the month's days and hours for every technician.",
    },
  ],
};
