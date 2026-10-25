import { Camera, LayoutDashboard, MapPin, Package } from "lucide-react";
import { DELIVERY_PAGE } from "../../../app/pageMeta";
import { DeliveryArt } from "../art/UseCaseArt";
import type { UseCaseContent } from "../components/UseCasePage";

export const DELIVERY_CONTENT: UseCaseContent = {
  meta: DELIVERY_PAGE,
  art: DeliveryArt,
  shortLabel: "Delivery",
  heading: "Track local deliveries with live status and proof of delivery",
  lead: "Fenzit turns each delivery into a job your riders update from their phone, so you see live status and photo and signature proof without calling anyone. Built for furniture stores, water can services, tiffin services and parcel teams.",
  problemHeading: "Running deliveries on calls and WhatsApp",
  problem: [
    "Customers keep calling to ask if the order has reached, and you have to call the rider to find out.",
    "There is no photo or signature to prove a delivery was actually made.",
    "Addresses pasted in chat messages get mistyped, and riders land at the wrong door.",
  ],
  stepsHeading: "How Fenzit works for deliveries",
  steps: [
    {
      key: "address",
      icon: MapPin,
      title: "Save the address",
      text: "Save each customer's drop address once with map search and a pin, so riders get one-tap directions.",
    },
    {
      key: "assign",
      icon: Package,
      title: "Assign the delivery",
      text: "Create the delivery as a job from the skill, the customer and the employee, and it appears on their phone.",
    },
    {
      key: "proof",
      icon: Camera,
      title: "Collect proof",
      text: "The rider marks each step done, location is recorded at the drop, and they add a photo of the delivered item plus the customer's signature on the phone.",
    },
    {
      key: "live",
      icon: LayoutDashboard,
      title: "Watch it live",
      text: "Status shows scheduled, in progress or done on your phone as it changes, with a PDF report at the end of the day.",
    },
  ],
  faq: [
    {
      key: "customer",
      question: "Can my customer track the delivery themselves?",
      answer:
        "Not yet. Fenzit has no customer-facing tracking link or portal. You see the live status on your phone and can tell the customer where things stand.",
    },
    {
      key: "proof",
      question: "What proof do I get that a delivery was made?",
      answer:
        "The rider records their location at the drop, takes a photo of the delivered item and collects the customer's signature on the phone. You see all of it in the job details.",
    },
    {
      key: "where",
      question: "Can I see where my delivery person is right now?",
      answer:
        "You can see how far the rider is from the customer's address while the job is on. There is no live map of rider movement.",
    },
    {
      key: "fleet",
      question: "Is Fenzit route planning software for big logistics fleets?",
      answer:
        "No. Fenzit does not plan routes or sequence stops. It is for small delivery teams that need each job tracked with live status and proof of delivery.",
    },
  ],
};
