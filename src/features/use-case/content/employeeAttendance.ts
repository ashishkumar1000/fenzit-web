import { FileText, MapPin, Smartphone, Users } from "lucide-react";
import { EMPLOYEE_ATTENDANCE_PAGE } from "../../../app/pageMeta";
import { EmployeeAttendanceArt } from "../art/EmployeeAttendanceArt";
import type { UseCaseContent } from "../components/UseCasePage";

export const EMPLOYEE_ATTENDANCE_CONTENT: UseCaseContent = {
  meta: EMPLOYEE_ATTENDANCE_PAGE,
  art: EmployeeAttendanceArt,
  shortLabel: "Attendance app",
  heading: "Attendance on every employee's phone, without the register",
  lead: "Fenzit is a phone-first app for field-service businesses. Employees check in from their own phones, the check-in is verified against your office location, and you see who is in today on yours.",
  problemHeading: "The register can't keep up with a team on the move",
  problem: [
    "Attendance lives in a paper register, and someone has to compile the totals at month end.",
    "Field staff start the day at sites nobody can see, so you learn about a late start only when a customer calls.",
    "When the hours are disputed, there is no record to settle it — one word against another.",
  ],
  stepsHeading: "How attendance runs in Fenzit",
  steps: [
    {
      key: "office",
      icon: MapPin,
      title: "Set the office location once",
      text: "Put the check-in point on the map for each office location. Every check-in after that is measured against it.",
    },
    {
      key: "checkin",
      icon: Smartphone,
      title: "Employees check in from their phones",
      text: "One tap in the Fenzit app, with the time and the GPS location recorded. The check-in counts at the office location, from the employee's own phone.",
    },
    {
      key: "daily",
      icon: Users,
      title: "Watch the day as it runs",
      text: "A live daily view shows who is in, who is late, and who is on leave — so you stop counting heads at the gate.",
    },
    {
      key: "reports",
      icon: FileText,
      title: "Close the month with reports",
      text: "Working hours and attendance come out as PDF reports for the month. No totals to add up by hand.",
    },
  ],
  faq: [
    {
      key: "hardware",
      question: "Do we need biometric machines or any hardware?",
      answer:
        "No — employees check in on their own phones. The Fenzit app verifies each check-in against your office location using GPS. There is no machine to buy, install, or repair.",
    },
    {
      key: "home",
      question: "Can someone check in from home?",
      answer:
        "No. A check-in is verified against the office location you set on the map. An employee sitting at home is not at that location, so the check-in does not count as present.",
    },
    {
      key: "leave",
      question: "What about leave requests?",
      answer:
        "Leave lives in the same app. An employee applies from their phone, you approve it from yours, and the daily view shows them on leave instead of absent.",
    },
    {
      key: "signin",
      question: "How do my employees sign in?",
      answer:
        "Each employee installs the Fenzit app on their own phone and signs in with a phone-number OTP. There are no usernames to hand out and no extra device to buy.",
    },
    {
      key: "map",
      question: "Can I see where my employees are through the day?",
      answer:
        "Not yet. Fenzit shows who is in, who is late, and who is on leave, and it records the location at check-in. It is not a live map of employee movement through the day.",
    },
  ],
};
