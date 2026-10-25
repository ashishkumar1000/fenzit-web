import { CheckCircle2, ClipboardList, MapPin, Send } from "lucide-react";
import { SALON_AT_HOME_PAGE } from "../../../app/pageMeta";
import { SalonAtHomeArt } from "../art/SalonAtHomeArt";
import type { UseCaseContent } from "../components/UseCasePage";

export const SALON_AT_HOME_CONTENT: UseCaseContent = {
  meta: SALON_AT_HOME_PAGE,
  art: SalonAtHomeArt,
  shortLabel: "Salon at home",
  heading: "Run every home salon visit, from booking to signature",
  lead: "Fenzit is a phone-first app for beauticians who work out of customers' homes. Every booking becomes a job on the beautician's phone, with the services to follow and directions to the doorstep, and each visit updates on your phone as it happens.",
  problemHeading: "The diary cannot tell you which beautician reached which home",
  problem: [
    "Bookings are scribbled in a diary, and addresses, timings and services get lost on the way.",
    "You cannot tell which beautician has reached which home without calling one after another.",
    "A delay comes to light only when the customer calls to ask where the beautician is.",
  ],
  stepsHeading: "How a home visit runs in Fenzit",
  steps: [
    {
      key: "booking",
      icon: ClipboardList,
      title: "The booking becomes a job",
      text: "Save the booking as a job with the customer's home address and map pin, and the services — cleanup, facial, waxing — written as the steps to follow.",
    },
    {
      key: "assign",
      icon: Send,
      title: "Assign the beautician",
      text: "The visit reaches the beautician's phone with the services for the appointment and one-tap directions to the doorstep.",
    },
    {
      key: "day",
      icon: MapPin,
      title: "Live status on the day",
      text: "Reached, started, finishing — every update lands on your phone as it happens, with the location recorded at the steps that need it.",
    },
    {
      key: "close",
      icon: CheckCircle2,
      title: "Close the visit",
      text: "The customer signs on the beautician's phone and the visit closes as done. Photos are for when you ask for them, not a rule for every visit.",
    },
  ],
  faq: [
    {
      key: "privacy",
      question: "Do visits need photos inside a customer's home?",
      answer:
        "No. A visit closes with the customer's signature, so proof does not depend on photos. Add a photo only when you ask for it — before and after for a bridal trial, say — and it comes back to you with the job.",
    },
    {
      key: "delays",
      question: "Will I know if a beautician is running late?",
      answer:
        "Yes. Each visit's status is on your phone as it changes: reached, started, finishing. If a morning's cleanups pile up, the statuses show it, and you can call the next customer before they have to chase you.",
    },
    {
      key: "attendance",
      question: "Do beauticians mark attendance in Fenzit?",
      answer:
        "Yes, in the same app. Beauticians check in from their own phones, verified against your office or studio location. You see who is in for the day, and the monthly attendance report sits alongside the visit reports.",
    },
    {
      key: "app",
      question: "Do beauticians need a separate device?",
      answer:
        "No. They sign in to the Fenzit app on their own phone with a phone-number OTP and see today's visits with the services and directions. There is no extra device to buy or charge.",
    },
    {
      key: "payments",
      question: "Can customers pay for a visit in Fenzit?",
      answer:
        "Not yet. Fenzit runs the visit — the booking, the live status, the signature — and keeps the record in PDF reports. Payments stay however you take them today.",
    },
  ],
};
