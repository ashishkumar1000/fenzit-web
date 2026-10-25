import { MapPin, ShieldCheck, Smartphone, Users } from "lucide-react";
import { GEOFENCING_PAGE } from "../../../app/pageMeta";
import { GeofencingArt } from "../art/GeofencingArt";
import type { UseCaseContent } from "../components/UseCasePage";

export const GEOFENCING_CONTENT: UseCaseContent = {
  meta: GEOFENCING_PAGE,
  art: GeofencingArt,
  shortLabel: "Geofencing",
  heading: "Check-ins you can trust, verified against your office location",
  lead: "Fenzit is a phone-first app for Indian field-service businesses. Mark your office on the map once, and your team checks in from their own phones — each check-in is verified against the office location. No hardware to buy.",
  problemHeading: "The register and WhatsApp can't tell you who really came in",
  problem: [
    "Attendance runs on trust: you see a name marked present, and that is all you ever see.",
    "The register is a WhatsApp message, so one person can mark attendance for another and nobody notices.",
    "Fingerprint machines arrive as hardware quotes, wiring work and service visits that a small team never needed.",
  ],
  stepsHeading: "How geofenced attendance works in Fenzit",
  steps: [
    {
      key: "mark",
      icon: MapPin,
      title: "Mark the office location",
      text: "Draw the check-in point once on the map — your shop, office or workshop. This saved point is what every check-in is verified against.",
    },
    {
      key: "checkin",
      icon: Smartphone,
      title: "Employees check in from their phones",
      text: "Each employee signs in to the Fenzit app with a phone-number OTP and checks in from their own phone. The time and the place are recorded together.",
    },
    {
      key: "verify",
      icon: ShieldCheck,
      title: "The check-in is verified",
      text: "Fenzit compares where the check-in happened with the office location you marked, using the phone's ordinary GPS. A check-in made away from the office does not pass.",
    },
    {
      key: "daily",
      icon: Users,
      title: "See the day at a glance",
      text: "The daily view shows who is in, who is late and who is on leave, and the monthly attendance report is ready as a PDF when salary day comes.",
    },
  ],
  faq: [
    {
      key: "wfh",
      question: "What about employees working from home?",
      answer:
        "A check-in made away from the marked office location does not verify, so a work-from-home day will not show as office attendance. Mark the day as leave as usual, and the monthly report stays honest.",
    },
    {
      key: "branches",
      question: "We have more than one office. Does that work?",
      answer:
        "Yes. Mark each office as its own location on the map, and employees check in against the office they work from.",
    },
    {
      key: "hardware",
      question: "Do we need to buy any hardware?",
      answer:
        "No — phones only. Employees use the Fenzit app on their own phones, and you mark the office on the map from yours. There is no fingerprint machine to buy, wire or repair.",
    },
    {
      key: "gps",
      question: "What if the GPS is not accurate?",
      answer:
        "Fenzit uses the ordinary GPS of the employee's phone — the same signal any map app on that phone uses. It records where the check-in happened and verifies it against the office location you marked. Like any map app, it can be less accurate indoors or in basements.",
    },
    {
      key: "livemap",
      question: "Can I see where my employees are through the day?",
      answer:
        "No. Fenzit records the time and place of each check-in and verifies it against the office location. It is not a live map of employee movement through the day.",
    },
  ],
};
