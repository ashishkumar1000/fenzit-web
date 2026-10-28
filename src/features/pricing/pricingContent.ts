import type { LucideIcon } from "lucide-react";
import { CreditCard, Clock, PhoneCall, Repeat } from "lucide-react";

// Mock content for the pricing page. The figures and plan details are sample copy until the
// owner confirms the real ones. Keep every number here, so one edit changes the whole page.

export type PerkItem = {
  key: string;
  icon: LucideIcon;
  title: string;
  detail: string;
};

export const PERKS: PerkItem[] = [
  { key: "card", icon: CreditCard, title: "No credit card", detail: "Start in 2 minutes" },
  {
    key: "unlimited",
    icon: Clock,
    title: "90 days unlimited",
    detail: "Full access for the whole trial",
  },
  { key: "cancel", icon: Repeat, title: "Cancel anytime", detail: "No lock-in fees" },
  { key: "setup", icon: PhoneCall, title: "Free setup call", detail: "Talk to our engineer" },
];

// Each line is in the app today, per the features page. Nothing here is planned or guessed.
export const TRIAL_FEATURES: string[] = [
  "Check in and out at your office",
  "Create jobs and assign them to your staff",
  "Add location, photos and a signature to each job",
  "PDF reports for jobs, and a monthly attendance report for each person",
];

export type TrialStep = {
  key: string;
  badge: string;
  title: string;
  body: string;
  footer: string;
};

export const TRIAL_STEPS: TrialStep[] = [
  {
    key: "free",
    badge: "Day 1 to 90",
    title: "100% free full access",
    body: "Use Fenzit with your whole team: field staff, supervisors and office staff. No charges.",
    footer: "Cost: $0.00 / month",
  },
  {
    key: "checkpoint",
    badge: "Day 75 check-in",
    title: "A fair price for your team",
    body: "We look at how many people use Fenzit. Then we send you a fair price before the trial ends.",
    footer: "No surprise charges ever",
  },
  {
    key: "monthly",
    badge: "Ongoing plan",
    title: "Flexible monthly terms",
    body: "Pay month by month, or save with a yearly plan. Your data stays with you.",
    footer: "Price changes with team size",
  },
];

export type PlanTier = {
  key: string;
  name: string;
  users: string;
  summary: string;
  features: string[];
  cta: string;
  highlighted: boolean;
};

export const PLANS: PlanTier[] = [
  {
    key: "starter",
    name: "Starter",
    users: "Up to 15 users",
    summary: "For small teams that want attendance and leave.",
    features: [
      "Check in and out at your office",
      "Apply for leave and see your leave history",
      "Monthly attendance report for each person",
      "PDF reports for jobs and attendance",
    ],
    cta: "Start free trial",
    highlighted: false,
  },
  {
    key: "growth",
    name: "Growth",
    users: "16 to 75 users",
    summary: "For teams that run jobs and attendance together.",
    features: [
      "Everything in Starter, plus:",
      "Create jobs and assign staff",
      "Add location, photos and a signature to each job",
      "Save customers with their address on a map",
      "Live alerts with a link to the job",
    ],
    cta: "Claim 90 days free",
    highlighted: true,
  },
  {
    key: "enterprise",
    name: "Large teams",
    users: "76+ users",
    summary: "For large teams that need more control.",
    features: [
      "Everything in Growth, plus:",
      "Office places, work hours, weekly offs and holidays",
      "Fix a day's attendance, with a record of the change",
      "Approve or cancel leave for someone else",
      "Each company sees only its own data",
    ],
    cta: "Contact sales",
    highlighted: false,
  },
];

export type FaqEntry = {
  key: string;
  question: string;
  answer: string;
};

export const PRICING_FAQ: FaqEntry[] = [
  {
    key: "trial",
    question: "What happens during the 90-day free trial?",
    answer:
      "Your whole team gets full access to all Fenzit features. This includes check-ins at the office, jobs with photos and signatures, leave requests, and reports. There are no limits on people or jobs.",
  },
  {
    key: "price",
    question: "How will we know our price before the trial ends?",
    answer:
      "We will contact you around day 75 with a clear price. It is based on how your team uses Fenzit. You can also call or email us at any time during the trial.",
  },
  {
    key: "card",
    question: "Do we need to enter a credit card?",
    answer:
      "No. You can sign up, set up your offices, create jobs and add your staff. You do not need to enter any payment details.",
  },
  {
    key: "seasonal",
    question: "What if our team size changes during the year?",
    answer:
      "Our prices are flexible. We look at how many people use Fenzit each month. You do not pay for staff who are not working.",
  },
  {
    key: "export",
    question: "Can we get our records if we stop using Fenzit?",
    answer:
      "Yes. You own your data. You can download PDF reports for jobs and monthly attendance at any time.",
  },
];

// Slider and calculator settings. Fleet size is a count of active field technicians.
export const SLIDER = {
  min: 5,
  max: 250,
  initial: 25,
  ticks: ["5 (small)", "50", "100", "250 (large)"],
};
