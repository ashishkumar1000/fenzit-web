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
    "Every feature Fenzit ships today: assign jobs and track them live, attendance with office locations, working hours and reports, and leave approvals — for owners and their field employees.",
};

export const ATTENDANCE_PAGE: PageMeta = {
  path: "/attendance",
  title: "Attendance and leave software for field teams — Fenzit",
  description:
    "GPS-verified check-ins from employees' own phones, office locations and working hours, a live daily view, monthly reports and leave approvals. Use attendance on its own or with jobs.",
};

export const FIELD_TRACKING_PAGE: PageMeta = {
  path: "/field-job-tracking",
  title: "Field job tracking software for Indian teams — Fenzit",
  description:
    "Create field jobs with clear steps, send them to employees, and track live status. Location recorded at the steps that need it, with photos, signatures and PDF reports.",
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
    "Create plumber jobs, assign by skill, and see live status. Plumbers add photos and the customer's signature from the site. A phone-first app for Indian plumbing teams.",
};

export const DELIVERY_PAGE: PageMeta = {
  path: "/delivery-tracking",
  title: "Local delivery tracking for small business — Fenzit",
  description:
    "Create deliveries as jobs, see live status, and get photo and signature proof of delivery from your riders. Built for small Indian delivery teams.",
};

export const COLLECTION_PAGE: PageMeta = {
  path: "/collection-agent-tracking",
  title: "Collection agent tracking for field visits — Fenzit",
  description:
    "Track collection agents and field visits with Fenzit. Location recorded at each visit, photo proof, live status and PDF reports — with attendance in the same app.",
};

/**
 * The client-only pages are not pre-rendered, but their empty shells still ship a real head. They
 * are noindex, so only the title matters for the browser tab; the values match the <title> each
 * page renders after hydration. The 404 shell uses the NotFoundPage title.
 */
export const CLIENT_ONLY_TITLES: Record<string, string> = {
  "/login": "Log in · Fenzit",
  "/admin": "Company admin · Fenzit",
  "404": "Page not found · Fenzit",
};
