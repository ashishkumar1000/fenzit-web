import { Camera, ClipboardList, FileText, Send } from "lucide-react";
import { CLEANING_PAGE } from "../../../app/pageMeta";
import { CleaningArt } from "../art/CleaningArt";
import type { UseCaseContent } from "../components/UseCasePage";

export const CLEANING_CONTENT: UseCaseContent = {
  meta: CLEANING_PAGE,
  art: CleaningArt,
  shortLabel: "Cleaning teams",
  heading: "Run the day's cleaning rounds on time, with proof of every room",
  lead: "Fenzit is a phone-first app for cleaning agencies. Create the day's rounds as jobs for your office, showroom and home clients, send them to your crew's phones, and get photos and the customer's signature back from every site.",
  problemHeading: "The round register can't tell you which rooms were cleaned",
  problem: [
    "The day's rounds are typed into a WhatsApp group every morning, and one missed message leaves an office or a showroom without its cleaning.",
    "The supervisor left with three sites to cover, and you have to call him to know whether the crew has reached and started.",
    "A client asks what the crew actually cleaned this month, and all you have to show is a tick in the register.",
  ],
  stepsHeading: "How a cleaning round runs in Fenzit",
  steps: [
    {
      key: "plan",
      icon: ClipboardList,
      title: "Plan the day's rounds",
      text: "Create a job for each client for the day — the morning round at an office, a deep clean at a showroom, a sofa shampoo at a home — with the address and map pin saved.",
    },
    {
      key: "assign",
      icon: Send,
      title: "Assign the crew",
      text: "The job reaches each cleaner's own phone with the steps to follow and one-tap directions to the client's address.",
    },
    {
      key: "proof",
      icon: Camera,
      title: "Proof of every room",
      text: "The cleaner ticks the steps and adds photos of the finished rooms as the round runs, and the customer signs on his phone at the end. Status updates reach you live from the site.",
    },
    {
      key: "reports",
      icon: FileText,
      title: "Monthly reports",
      text: "At month end, download a PDF report of the jobs your crew completed, with the photos and the signatures inside — ready for your review or to share with the client.",
    },
  ],
  faq: [
    {
      key: "proof",
      question: "What proof can I show a client?",
      answer:
        "The cleaner adds photos of the finished rooms during the round, and the customer signs on his phone at the end. The job's PDF report keeps all of it together, so a client who asks what was cleaned gets an answer, not a promise.",
    },
    {
      key: "repeats",
      question: "Do the daily rounds repeat on their own?",
      answer:
        "Not yet. The morning round at an office does not create itself — you create the day's jobs in a few taps, with each client's address and map pin already saved. The crew then sees its list for the day on the phone.",
    },
    {
      key: "deepclean",
      question: "What about deep cleans and sofa or carpet shampoo visits?",
      answer:
        "They are jobs like the rounds. Give the visit its own steps — the rooms to cover, the sofas to shampoo — and the cleaner works through them, adding before and after photos as he goes. The customer signs when the visit closes.",
    },
    {
      key: "attendance",
      question: "Can I keep attendance for the cleaners in the same app?",
      answer:
        "Yes. Every cleaner checks in from his own phone, verified by GPS against your office locations, and you see a live daily view of who is in. Working hours and the month's attendance report come from the same app, so the rounds and the attendance live in one place.",
    },
    {
      key: "device",
      question: "Do cleaners need to carry a separate device?",
      answer:
        "No. The Fenzit app runs on each employee's own phone, signed in with a phone-number OTP — no extra device to buy or charge. The steps, the photos, the customer's signature and the live status all go through that one phone.",
    },
  ],
};
