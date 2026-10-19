import { apiFetch } from "../../services/api";

export type EarlyAccessInput = {
  email: string;
  /** E.164 form, for example +919876543210. Omitted when the visitor gives no phone. */
  phone?: string;
};

export type EarlyAccessResponse = {
  message: string;
  /** The visitor's reference number, for example FZ-00042. Same for a repeat email. */
  reference: string;
};

/** POST /api/v1/early-access on fenzit-be. Public, so it sends no token. */
export function joinEarlyAccess(input: EarlyAccessInput): Promise<EarlyAccessResponse> {
  return apiFetch<EarlyAccessResponse>("/api/v1/early-access", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}
