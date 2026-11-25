import { ApiError, NoCompanySelectedError } from "../services/api";

// Plain-English copy for each error_code the BE can return. Screens show these
// strings, never ApiError.message, because that text is written for developers.
const MESSAGES_BY_CODE = new Map<string, string>([
  ["UNAUTHORIZED", "Your session has ended. Please sign in again."],
  ["FORBIDDEN", "You do not have permission to do this."],
  ["VALIDATION_ERROR", "Please check the highlighted fields and try again."],
  ["RESOURCE_NOT_FOUND", "We could not find this information. It may have been removed."],
  // Neutral on purpose: a duplicate on one screen must not say that another
  // company holds the number. Screen-specific wording belongs at the call site.
  ["DUPLICATE_RESOURCE", "This information already exists."],
  ["ALREADY_IN_TEAM", "This person is already part of your team."],
  ["RATE_LIMIT_EXCEEDED", "Too many attempts. Please wait a few minutes and try again."],
  ["RATE_LIMITED", "Too many attempts. Please wait a few minutes and try again."],
  ["INVALID_OTP", "That code is not right. Check it and try again."],
  ["OTP_EXPIRED", "That code has expired. Ask for a new one."],
  ["OTP_SESSION_LOCKED", "Too many wrong codes. Wait before you try again."],
  ["OTP_SEND_FAILED", "We could not send the code. Try again in a moment."],
  ["REPORT_ALREADY_RESOLVED", "Someone already handled this report. The list has been refreshed."],
  [
    "DELETION_REQUEST_ALREADY_RESOLVED",
    "Someone already handled this request. The list has been refreshed.",
  ],
  ["JOB_NOT_PENDING", "That job was already decided. The list has been refreshed."],
  ["JOB_NOT_MODIFIABLE", "That job can no longer be edited. The list has been refreshed."],
  ["LEAVE_TYPE_NOT_CONFIGURABLE", "That leave type is kept for history and cannot be edited."],
  [
    "LEAVE_NOT_PENDING",
    "That request is no longer waiting for a decision. The list has been refreshed.",
  ],
  ["LEAVE_NOT_REVOKABLE", "Only leave that has not started yet can be revoked."],
  ["LEAVE_INVALID_TRANSITION", "That request has already moved on. The list has been refreshed."],
]);

export const NO_COMPANY_MESSAGE =
  "Please select a company first. Search for the person and choose the company you want to manage.";
export const GENERIC_MESSAGE = "Something went wrong. Please try again.";
export const SERVER_MESSAGE = "Something went wrong on our side. Please try again in a moment.";

/**
 * Turns any thrown value into a sentence a user can read. Known `error_code`s
 * get their own copy. Server failures get a retry prompt. Anything else gets
 * the generic message.
 */
export function messageForError(error: unknown): string {
  if (error instanceof NoCompanySelectedError) {
    return NO_COMPANY_MESSAGE;
  }
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
