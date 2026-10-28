import { apiFetch } from "../../services/api";

export type ContactRequestKind = "call_back" | "demo";

export type ContactRequestInput = {
  kind: ContactRequestKind;
  name?: string;
  company?: string;
  email?: string;
  /** E.164 form, for example +919876543210. Omitted when the visitor gives no phone. */
  phone?: string;
  note?: string;
};

export type ContactRequestResponse = {
  message: string;
};

/** POST /api/v1/contact-requests on fenzit-be. Public, so it sends no token. */
export function sendContactRequest(input: ContactRequestInput): Promise<ContactRequestResponse> {
  return apiFetch<ContactRequestResponse>("/api/v1/contact-requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}
