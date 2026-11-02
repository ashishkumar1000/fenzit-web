import { apiFetch } from "../../services/api";

/**
 * Public calls for the account deletion page. Nothing here is signed in. The
 * code is sent through the same send call the sign-in page uses, and the BE
 * never returns the code itself.
 */

const JSON_HEADERS = { "Content-Type": "application/json" };

export interface DeletionOtpSent {
  otp_session_id: string;
  expires_at: string;
}

/** POST /api/v1/auth/otp/send. Public. */
export function sendDeletionCode(phoneNumber: string): Promise<DeletionOtpSent> {
  return apiFetch<DeletionOtpSent>("/api/v1/auth/otp/send", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ countryCode: "+91", phoneNumber }),
  });
}

/**
 * POST /api/v1/account-deletion/requests. Public. The BE answers the same way
 * whether or not the number has an account, so the page never reveals who has one.
 */
export function submitDeletionRequest(otpSessionId: string, otpCode: string): Promise<void> {
  return apiFetch<void>("/api/v1/account-deletion/requests", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ otpSessionId, otpCode }),
  });
}
