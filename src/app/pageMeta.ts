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
