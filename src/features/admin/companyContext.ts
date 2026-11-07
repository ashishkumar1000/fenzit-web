import { COMPANY_HEADER, NoCompanySelectedError } from "../../services/api";
import type { DossierMembership } from "./dossier-types";

/**
 * The company staff are working on. It lives in the lookup URL as `?company=<uuid>`,
 * so a reload keeps it and no browser storage or effect is needed. No param means
 * no company, and then no company-scoped request may be sent.
 */

export const COMPANY_PARAM = "company";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True only for a UUID string. Anything else is never sent as a header. */
export function isCompanyId(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/**
 * The company to work on, or null. The URL value counts only when it is a
 * UUID and is one of this person's companies, so a stale or hand-typed id
 * is ignored.
 */
export function activeCompanyFrom(
  params: URLSearchParams,
  memberships: DossierMembership[],
): string | null {
  const raw = params.get(COMPANY_PARAM);
  if (!isCompanyId(raw)) return null;
  const id = raw.toLowerCase();
  const listed = memberships.some(
    (m) => isCompanyId(m.companyId) && m.companyId.toLowerCase() === id,
  );
  return listed ? id : null;
}

/**
 * Headers for a staff company-scoped request. Throws NoCompanySelectedError when
 * no company is picked, before any request is made.
 */
export function companyScopedHeaders(companyId: string | null): Record<string, string> {
  if (companyId === null) {
    throw new NoCompanySelectedError();
  }
  return { [COMPANY_HEADER]: companyId };
}

/** The current search string with the company set, or cleared when null. Other params stay. */
export function searchWithCompany(search: string, companyId: string | null): string {
  const params = new URLSearchParams(search);
  if (companyId === null) {
    params.delete(COMPANY_PARAM);
  } else {
    params.set(COMPANY_PARAM, companyId);
  }
  const text = params.toString();
  return text === "" ? "" : `?${text}`;
}
