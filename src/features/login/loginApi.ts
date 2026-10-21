import { apiFetch } from "../../services/api";
import { LOGIN_DIAL_CODE } from "./loginInput";

/** The identity the BE returns on a successful sign-in. Only the token is kept in the browser. */
export type LoginResponse = {
  token: string;
  user: {
    userId: string;
    tenantId: string | null;
    role: string | null;
    name: string | null;
    platformAdmin: boolean;
  };
};

export type OtpSendResponse = {
  otp_session_id: string;
  expires_at: string;
};

const JSON_HEADERS = { "Content-Type": "application/json" };

/** POST /api/v1/auth/otp/send. Public. The BE never returns the code. */
export function sendOtp(phoneNumber: string): Promise<OtpSendResponse> {
  return apiFetch<OtpSendResponse>("/api/v1/auth/otp/send", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ countryCode: LOGIN_DIAL_CODE, phoneNumber }),
  });
}

/** POST /api/v1/auth/otp/verify. Public. */
export function verifyOtp(otpSessionId: string, otpCode: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/api/v1/auth/otp/verify", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ otpSessionId, otpCode }),
  });
}

/** POST /api/v1/auth/email/login. Public. Signs in an existing user only. */
export function emailLogin(email: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/api/v1/auth/email/login", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ email, password }),
  });
}
