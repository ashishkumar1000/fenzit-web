import { CONTACT_EMAIL } from "../config/contact";

/** The date shown on every legal page. Change it here when a page changes. */
const LEGAL_UPDATED = "28 October 2026";

// Plain-English copy for the legal pages. Each sentence states what Fenzit does today, or a
// promise the team has agreed to keep. Anything the owner has not decided yet is left off.

export type LegalSection = {
  id: string;
  title: string;
  paragraphs: string[];
};

export const PRIVACY_LEAD = `Last updated ${LEGAL_UPDATED}. What Fenzit collects, why we collect it, who we share it with, and what you can ask us to do.`;

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    id: "who-title",
    title: "Who we are",
    paragraphs: [
      "Fenzit is software for field teams. It runs jobs, attendance and leave in one app.",
      `This policy covers the Fenzit website, the Fenzit app and the team data you put into it. For any question about it, write to ${CONTACT_EMAIL}.`,
    ],
  },
  {
    id: "collect-title",
    title: "What we collect",
    paragraphs: [
      "When you ask for a call back, a demo or early access, we keep your name, phone number or email, and anything else you choose to tell us.",
      "When you sign in, we keep your phone number. We send a one-time code by SMS to check the number is yours.",
      "What your team adds to Fenzit includes the names and contact details of employees and customers, job details, photos, customer signatures, attendance check-ins and leave requests.",
      "Location is taken only at job steps and attendance check-ins that need it. We keep the place and time of each one.",
      "When you type an address in the app, the text is sent to Google to suggest matches.",
    ],
  },
  {
    id: "use-title",
    title: "Why we use it",
    paragraphs: [
      "We use your details to sign you in and run Fenzit for your team.",
      "We keep the job, attendance and leave records that your team relies on.",
      "We use your call back, demo and early access details only to reply to you about Fenzit.",
      "We use these details to keep the service secure and to fix problems.",
    ],
  },
  {
    id: "share-title",
    title: "Who we share it with",
    paragraphs: [
      "We use a few service providers to run Fenzit. Each one handles data only to give us its service.",
      "Supabase stores our database. Render runs our server. Cloudflare stores the photos and signatures that your team uploads. MSG91 sends the one-time sign-in codes by SMS. Google suggests addresses in the app.",
      "We do not sell your data, and we do not share it for advertising.",
    ],
  },
  {
    id: "where-title",
    title: "Where your data is kept",
    paragraphs: [
      "Our database and server are in Singapore. Photos and signatures are kept in Cloudflare storage and opened through links that expire.",
    ],
  },
  {
    id: "keep-title",
    title: "How long we keep it",
    paragraphs: [
      "We keep your team's data for as long as your team's account is active.",
      "When an account is closed, we delete the team's data. Some records may be kept for longer where the law requires it.",
    ],
  },
  {
    id: "rights-title",
    title: "Your rights",
    paragraphs: [
      "You can ask us to show you the personal data we hold about you, to correct it, to delete it, or to stop using it for a purpose you have agreed to.",
      `Write to ${CONTACT_EMAIL} to make a request. We will reply and tell you what we have done.`,
      `If you are not happy with our reply, write to ${CONTACT_EMAIL} again and we will look at it.`,
    ],
  },
  {
    id: "changes-title",
    title: "Changes to this policy",
    paragraphs: [
      "We will post any change on this page and update the date at the top.",
      "If a change affects how we use personal data, we will tell you before it starts.",
    ],
  },
];

export const TERMS_LEAD = `Last updated ${LEGAL_UPDATED}. These terms apply when you use the Fenzit app, the website and the services behind them.`;

export const TERMS_SECTIONS: LegalSection[] = [
  {
    id: "service-title",
    title: "What Fenzit is",
    paragraphs: [
      "Fenzit is software for field service teams. It helps you run jobs, follow field staff, record attendance and manage leave.",
    ],
  },
  {
    id: "account-title",
    title: "Your account",
    paragraphs: [
      "Each person signs in with their own phone number and a one-time code. Give accurate details when you sign up.",
      "You are responsible for who in your team has access to the app, and for keeping their sign-in details safe.",
    ],
  },
  {
    id: "trial-title",
    title: "Free trial",
    paragraphs: [
      "Every team gets 3 months free to try Fenzit.",
      "We will tell you the price for your team before the trial ends. We will not charge you until we have told you the price and how to pay.",
    ],
  },
  {
    id: "data-title",
    title: "Your data",
    paragraphs: [
      "The data your team adds to Fenzit belongs to your team.",
      "You let us store and process it so that we can run Fenzit for you. Our privacy policy explains how we do that.",
    ],
  },
  {
    id: "use-title",
    title: "Acceptable use",
    paragraphs: [
      "Use Fenzit only for your own business.",
      "Do not upload anything illegal, try to get around the app's security, look at another company's data, or send spam through Fenzit.",
    ],
  },
  {
    id: "availability-title",
    title: "Availability",
    paragraphs: [
      "We work to keep Fenzit running. We sometimes need planned maintenance or a fix, and things can still go wrong.",
      "When we know about planned maintenance, we will tell you in advance.",
    ],
  },
  {
    id: "stopping-title",
    title: "Stopping",
    paragraphs: [
      `You can stop using Fenzit at any time. Write to ${CONTACT_EMAIL} to close your team's account.`,
      "Tell us before you close the account, so we can help you keep a copy of your team's records where we can.",
    ],
  },
  {
    id: "changes-title",
    title: "Changes to these terms",
    paragraphs: [
      "We will post any change on this page and update the date at the top.",
      "If a change matters to you, we will tell you before it takes effect.",
    ],
  },
  {
    id: "contact-title",
    title: "Questions",
    paragraphs: [`Write to ${CONTACT_EMAIL} with any question about these terms.`],
  },
];

export const SECURITY_LEAD = `Last updated ${LEGAL_UPDATED}. How Fenzit keeps each team's data apart and protects sign-in, and what to do if you find a problem.`;

export const SECURITY_SECTIONS: LegalSection[] = [
  {
    id: "signin-title",
    title: "How people sign in",
    paragraphs: ["Each person signs in with their phone number and a one-time code sent by SMS."],
  },
  {
    id: "separate-title",
    title: "Each company's data is kept apart",
    paragraphs: [
      "Each company sees only its own jobs, attendance, people and reports.",
      "Our server checks every request against the company it belongs to before it returns any data.",
    ],
  },
  {
    id: "transit-title",
    title: "Data in transit",
    paragraphs: [
      "Fenzit's website and app connect to our servers over HTTPS, so data sent between them is encrypted in transit.",
    ],
  },
  {
    id: "files-title",
    title: "Photos and signatures",
    paragraphs: [
      "Photos and customer signatures are kept in private storage. You open them through links that expire.",
    ],
  },
  {
    id: "location-title",
    title: "Location",
    paragraphs: [
      "Location is taken only at job steps and attendance check-ins that need it, and not at any other time.",
    ],
  },
  {
    id: "report-title",
    title: "Report a security problem",
    paragraphs: [
      `If you think something is not secure, write to ${CONTACT_EMAIL} and tell us what you saw. We will reply and tell you what we are doing about it.`,
      "Please do not test our systems in a way that could harm other customers.",
    ],
  },
];
