/**
 * Head metadata for the pages whose head the build rewrites, in one place. The prerender script
 * bakes these values into each page's static HTML (see scripts/prerender.ts), and pages that can
 * also be reached by client-side navigation reuse the same titles, so the document title matches
 * the static HTML from the first paint. The home page's head lives directly in index.html and is
 * the template every other page starts from, so it needs no entry here.
 *
 * Keep titles and descriptions free of double quotes: they are injected into HTML attributes.
 */
export const SITE_URL = "https://fenzit.com";

export type PageMeta = {
  /** Canonical path, starting with a slash. */
  path: string;
  title: string;
  description: string;
};

export const FEATURES_PAGE: PageMeta = {
  path: "/features",
  title: "Fenzit features — jobs, attendance and leave in one app",
  description:
    "Every feature Fenzit ships today: live job tracking, attendance with office locations, working hours, reports and leave approvals.",
};

export const ATTENDANCE_PAGE: PageMeta = {
  path: "/attendance",
  title: "Attendance and leave software for field teams — Fenzit",
  description:
    "GPS-verified check-ins from employees' own phones, office locations, working hours, monthly reports and leave approvals.",
};

export const FIELD_TRACKING_PAGE: PageMeta = {
  path: "/field-job-tracking",
  title: "Field job tracking software for small teams — Fenzit",
  description:
    "Create field jobs with clear steps, send them to employees, and track live status. Photos, signatures and PDF reports included.",
};

export const AC_SERVICE_PAGE: PageMeta = {
  path: "/ac-service-software",
  title: "AC service business software for job tracking — Fenzit",
  description:
    "Run AC and appliance service on the phone: create service jobs, assign technicians by skill, get photos, signatures and live status, and file PDF reports.",
};

export const PLUMBER_PAGE: PageMeta = {
  path: "/plumber-software",
  title: "Plumber dispatch software and job tracking — Fenzit",
  description:
    "Create plumber jobs, assign by skill, and see live status. Plumbers add photos and the customer's signature from the site. A phone-first app for plumbing teams.",
};

export const DELIVERY_PAGE: PageMeta = {
  path: "/delivery-tracking",
  title: "Local delivery tracking for small business — Fenzit",
  description:
    "Create deliveries as jobs, see live status, and get photo and signature proof of delivery from your riders. Built for small delivery teams.",
};

export const COLLECTION_PAGE: PageMeta = {
  path: "/collection-agent-tracking",
  title: "Collection agent tracking for field visits — Fenzit",
  description:
    "Track collection agents and field visits with Fenzit. Location at each visit, photo proof, live status and PDF reports.",
};

export const EMPLOYEE_ATTENDANCE_PAGE: PageMeta = {
  path: "/employee-attendance-app",
  title: "Employee attendance app for small teams — Fenzit",
  description:
    "GPS-verified attendance from employees' own phones: check-ins at office locations, a live daily view, working hours and monthly reports.",
};

export const GEOFENCING_PAGE: PageMeta = {
  path: "/geofencing-attendance",
  title: "Geofencing attendance app for teams — Fenzit",
  description:
    "Attendance with office geofencing: employees check in from their own phones, and Fenzit verifies the check-in against the office location. No hardware.",
};

export const LEAVE_MANAGEMENT_PAGE: PageMeta = {
  path: "/leave-management-software",
  title: "Leave management software for small teams — Fenzit",
  description:
    "Leave requests, approvals and a clear record in one place, next to attendance. Employees apply from their phones; you approve from yours.",
};

export const TECHNICIAN_TRACKING_PAGE: PageMeta = {
  path: "/technician-tracking-software",
  title: "Technician tracking software for field jobs — Fenzit",
  description:
    "Assign service jobs to technicians and follow live status, location and photo proof from the site. A phone-first app for field teams.",
};

export const SERVICE_BUSINESS_PAGE: PageMeta = {
  path: "/service-business-software",
  title: "Service business software for field teams — Fenzit",
  description:
    "Run jobs, attendance and leave in one app for your service business. Assign work, verify check-ins, and file reports — from your phone.",
};

export const APPLIANCE_REPAIR_PAGE: PageMeta = {
  path: "/appliance-repair-software",
  title: "Home appliance repair job software — Fenzit",
  description:
    "Run appliance repair visits on the phone: assign jobs, follow live status, and get photos and signatures as proof of the finished repair.",
};

export const CCTV_PAGE: PageMeta = {
  path: "/cctv-installation-software",
  title: "CCTV installation job tracking software — Fenzit",
  description:
    "Manage CCTV installation and service jobs: assign your installers, follow live status, and get photos of the finished camera work from site.",
};

export const CLEANING_PAGE: PageMeta = {
  path: "/cleaning-services-software",
  title: "Cleaning business software for field teams — Fenzit",
  description:
    "Run daily cleaning visits from your phone: assign client jobs with checklists, get photo proof of finished rooms, live status and monthly reports.",
};

export const ELECTRICIAN_PAGE: PageMeta = {
  path: "/electrician-software",
  title: "Electrician job tracking software — Fenzit",
  description:
    "Create electrician jobs, assign by skill, and see live status from the site. Photos and the customer's signature come back with every job.",
};

export const FACILITY_MANAGEMENT_PAGE: PageMeta = {
  path: "/facility-management-software",
  title: "Facility management software for site teams — Fenzit",
  description:
    "Manage site teams across facilities: attendance with office locations, daily job rounds with photo proof, leave approvals and monthly reports.",
};

export const IT_AMC_PAGE: PageMeta = {
  path: "/it-amc-software",
  title: "IT AMC service job software — Fenzit",
  description:
    "Run IT and computer AMC visits on the phone: schedule engineers, track each service live, and file signed service reports for every client.",
};

export const PEST_CONTROL_PAGE: PageMeta = {
  path: "/pest-control-software",
  title: "Pest control business software for visits — Fenzit",
  description:
    "Assign pest control visits, track treatment status live, and get photo proof from every site. Built for small pest control teams.",
};

export const SALON_AT_HOME_PAGE: PageMeta = {
  path: "/salon-at-home-software",
  title: "Salon at home business software — Fenzit",
  description:
    "Run salon at home visits: assign beauticians to bookings, follow live status, and get photos and signatures from every home visit.",
};

export const SOLAR_PAGE: PageMeta = {
  path: "/solar-installation-software",
  title: "Solar installation job tracking software — Fenzit",
  description:
    "Run solar site surveys and installations as tracked jobs: assign your crew, follow live status, and get photo reports from every rooftop.",
};

export const WATER_PURIFIER_PAGE: PageMeta = {
  path: "/water-purifier-service-software",
  title: "Water purifier service software — Fenzit",
  description:
    "Track every RO service visit: assign jobs by skill, see live status, and get photo proof and service reports. For water purifier and AMC teams.",
};

export const PRICING_PAGE: PageMeta = {
  path: "/pricing",
  title: "Fenzit pricing — 3 months free for every team",
  description:
    "Every team gets 3 months free to try Fenzit. Call or email us for the price for your team before the trial ends.",
};

export const BOOK_DEMO_PAGE: PageMeta = {
  path: "/book-demo",
  title: "Book a Fenzit demo for your field team",
  description:
    "Tell us about your team and we will reach out to show you Fenzit: jobs, attendance and leave in one app.",
};

export const DATA_SAFETY_PAGE: PageMeta = {
  path: "/data-safety",
  title: "How Fenzit keeps your business data separate",
  description:
    "Phone and one-time code sign-in, each company's data kept separate, and location taken only at job steps and attendance check-ins that need it.",
};

export const PARTNERS_PAGE: PageMeta = {
  path: "/partners",
  title: "Partner with Fenzit for field service teams",
  description:
    "Installers, service companies and software resellers can talk to Fenzit about working together to bring field teams on board.",
};

/**
 * Every indexable page except the home page, whose head lives directly in index.html. The
 * prerender script walks this list, so adding a page to the site means adding its meta here
 * plus a route and content file.
 */
export const PUBLIC_PAGES: PageMeta[] = [
  PRICING_PAGE,
  BOOK_DEMO_PAGE,
  DATA_SAFETY_PAGE,
  PARTNERS_PAGE,
  FEATURES_PAGE,
  ATTENDANCE_PAGE,
  EMPLOYEE_ATTENDANCE_PAGE,
  GEOFENCING_PAGE,
  LEAVE_MANAGEMENT_PAGE,
  FIELD_TRACKING_PAGE,
  TECHNICIAN_TRACKING_PAGE,
  SERVICE_BUSINESS_PAGE,
  AC_SERVICE_PAGE,
  APPLIANCE_REPAIR_PAGE,
  CCTV_PAGE,
  CLEANING_PAGE,
  COLLECTION_PAGE,
  DELIVERY_PAGE,
  ELECTRICIAN_PAGE,
  FACILITY_MANAGEMENT_PAGE,
  IT_AMC_PAGE,
  PEST_CONTROL_PAGE,
  PLUMBER_PAGE,
  SALON_AT_HOME_PAGE,
  SOLAR_PAGE,
  WATER_PURIFIER_PAGE,
];

/**
 * The client-only pages are not pre-rendered, but their empty shells still ship a real head. They
 * are noindex, so only the title matters for the browser tab; the values match the <title> each
 * page renders after hydration. The 404 shell uses the NotFoundPage title.
 */
export const CLIENT_ONLY_TITLES: Record<string, string> = {
  "/login": "Log in · Fenzit",
  "/admin": "Console · Fenzit",
  "/admin/inspect": "Console · Fenzit",
  "/admin/account": "Console · Fenzit",
  "/admin/company": "Console · Fenzit",
  "/admin/company/customers": "Console · Fenzit",
  "/admin/company/employees": "Console · Fenzit",
  "/admin/company/jobs": "Console · Fenzit",
  "/admin/company/holidays": "Console · Fenzit",
  "/admin/company/attendance": "Console · Fenzit",
  "/admin/me": "Console · Fenzit",
  "404": "Page not found · Fenzit",
};
