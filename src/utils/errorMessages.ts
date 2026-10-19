import { ApiError } from "../services/api";

// Plain-English copy for each error_code the BE can return. Screens show these
// strings, never ApiError.message, because that text is written for developers.
const MESSAGES_BY_CODE = new Map<string, string>([
  ["UNAUTHORIZED", "Your session has ended. Sign in again to continue."],
  ["FORBIDDEN", "You do not have permission to do this."],
  ["VALIDATION_ERROR", "Check the highlighted fields and try again."],
  ["RESOURCE_NOT_FOUND", "We could not find that. It may have been removed."],
  ["DUPLICATE_RESOURCE", "That already exists."],
  ["RATE_LIMIT_EXCEEDED", "Too many attempts. Wait a few minutes and try again."],
  ["RATE_LIMITED", "Too many attempts. Wait a few minutes and try again."],
  ["INVALID_OTP", "That code is not right. Check it and try again."],
  ["OTP_EXPIRED", "That code has expired. Ask for a new one."],
  ["OTP_SESSION_LOCKED", "Too many wrong codes. Wait before you try again."],
  ["OTP_SEND_FAILED", "We could not send the code. Try again in a moment."],
]);

export const GENERIC_MESSAGE = "Something went wrong. Try again.";
export const SERVER_MESSAGE = "Something went wrong on our side. Try again in a moment.";

/**
 * Turns any thrown value into a sentence a user can read. Known `error_code`s
 * get their own copy. Server failures get a retry prompt. Anything else gets
 * the generic message.
 */
export function messageForError(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return GENERIC_MESSAGE;
  }

  // Status 0 means no response came back. Its message is already plain English.
  if (error.status === 0) {
    return error.message;
  }

  if (error.errorCode !== undefined) {
    const known = MESSAGES_BY_CODE.get(error.errorCode);
    if (known !== undefined) {
      return known;
    }
  }

  return error.status >= 500 ? SERVER_MESSAGE : GENERIC_MESSAGE;
}
