import { Camera, ClipboardList, FileText, UserCheck } from "lucide-react";
import { AC_SERVICE_PAGE } from "../../../app/pageMeta";
import { AcServiceArt } from "../art/UseCaseArt";
import type { UseCaseContent } from "../components/UseCasePage";

export const AC_SERVICE_CONTENT: UseCaseContent = {
  meta: AC_SERVICE_PAGE,
  art: AcServiceArt,
  shortLabel: "AC service",
  heading: "AC service software for installations, repairs and AMC visits",
  lead: "Create service jobs, assign technicians by skill, and watch each job move from scheduled to done. Technicians add photos and the customer's signature on their phones, and you keep the PDF reports.",
  problemHeading: "Running AC service from a diary breaks fast",
  problem: [
    "Jobs sit in a diary or register, so nobody knows today's schedule without calling around.",
    "Customers ring again and again to ask when the technician will reach, and you answer from memory.",
    "There is no record of which technician did which job, what work was done, or who signed off on it.",
  ],
  stepsHeading: "How Fenzit runs an AC service job",
  steps: [
    {
      key: "create",
      icon: ClipboardList,
      title: "Create the job",
      text: "Save the customer with address search and a map pin, then create the service job — an installation, gas charging or an AMC visit.",
    },
    {
      key: "assign",
      icon: UserCheck,
      title: "Assign by skill",
      text: "Pick a technician whose skills match the job; they get a live notification with the job link.",
    },
    {
      key: "record",
      icon: Camera,
      title: "Record the work",
      text: "The technician follows the steps for each job, adds photos of the work and the customer's signature on the phone, and location is recorded at the steps that need it.",
    },
    {
      key: "file",
      icon: FileText,
      title: "Track and file",
      text: "Watch the status move live from scheduled to in progress to done, see the technician's distance from the site, and file the PDF report.",
    },
  ],
  faq: [
    {
      key: "phones",
      question: "Do my technicians need smartphones?",
      answer:
        "Yes. Fenzit is a mobile app that technicians sign into with their phone number and an OTP, so each one needs a smartphone with a working internet connection.",
    },
    {
      key: "proof",
      question: "How do I prove the work was done?",
      answer:
        "The technician adds photos of the completed work and the customer signs on the phone. Both stay with the job, and you can export a PDF report.",
    },
    {
      key: "where",
      question: "Can I see where my technicians are?",
      answer:
        "You can see a technician's distance from the job site when a step records location. Fenzit does not show a live map of technicians moving between jobs.",
    },
    {
      key: "amc",
      question: "Does it handle invoices and AMC contracts?",
      answer:
        "No. Fenzit covers the service work itself: jobs, attendance and leave. It does not make invoices or store AMC contracts.",
    },
  ],
};
