# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Small-business owners in India running field service teams (electronics repair and similar trades). They use this web console from a browser to set up the business, manage employees and offices, create and track jobs, review attendance and leave, and read reports — while their employees use the Fenzit Android app in the field.

## Product Purpose

Fenzit is attendance + job management for small field-workforce businesses. This console is the owner's management surface: it makes team setup, job assignment, and verifying work (who checked in where, when, what was done) administrable from a desk.

## Positioning

[Inferred from implementation — confirm with owner.] Verification-first attendance: location-verified check-in/out against a per-office geofence radius, tied directly to job execution records, so attendance and jobs form one connected record per employee per day rather than two separate modules.

## Operating Context

- India, small businesses; owners are not desktop-software natives — plain English is a hard requirement.
- User-facing copy says **"Employee"**, never "Technician" (workspace terminology rule; internal identifiers keep `technician`).
- Indian English; no Hindi words in copy. Hindi localization explicitly deferred by the owner (2026-10-03) — do not plan or start it.
- Three-repo product: this console (Vite + React), the Android app (`fenzit-app`, React Native), and the `fenzit-be` backend; deployments are independent.

## Capabilities and Constraints

- Confirmed: employee management + SMS-OTP invites, offices with geofence radius, job creation/tracking, attendance records and PDF reports, leave management, role-keyed routing, server-driven app config.
- Design-system tokens and atomic components are mandatory (workspace FE rules; a design-system lock runs in the pre-commit gauntlet alongside eslint/prettier/css-modules pairing/tsc/tests).
- bun only — never npm, yarn, or pnpm.
- Open decision: DPIIT (Startup India) recognition badge for the footer — designs previewed, none picked (2026-11-07).

## Brand Commitments

- Name: Fenzit.
- DPIIT recognition certificate DIPP290906 (valid to 20-09-2036) is real and citable; no official Startup India badge asset exists and none may be fabricated.

## Evidence on Hand

No marketing content, testimonials, or customer evidence exist in-repo. Future surface work must not invent customers, benchmarks, or claims.

## Product Principles

1. Plain-English clarity first — if a non-technical owner cannot parse the screen, it is not done.
2. The record is the truth — screens show derived state honestly; never invent numbers the backend did not produce.
3. Mobile-first parity — the console mirrors what the Android app records; no divergent workflows.
