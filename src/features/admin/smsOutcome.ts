/** What an invite or resend result says about the SMS — the invite itself is
 *  always saved. Null or unknown statuses mean sending is switched off. One
 *  wording for the invite dialog and the table's resend link, so the same
 *  outcome never reads two ways. */
export function smsOutcome(status: string | null): string {
  switch (status) {
    case "sent":
      return "The invite SMS went out to their phone.";
    case "refused_cap":
      return "The invite is saved, but too many messages went to this number in a short time. Try again after some time.";
    case "failed":
      return "The invite is saved, but the SMS could not be sent just now.";
    default:
      return "The invite is saved. SMS sending is switched off, so no SMS went out.";
  }
}

/** The one-line mark for a resent invite: short on the row, full detail only
 *  in the dialog. */
export function resendOutcomeLine(status: string | null): string {
  switch (status) {
    case "sent":
      return "Invite resent.";
    case "refused_cap":
      return "Resent, but too many messages went to this number. Try again after some time.";
    case "failed":
      return "Resent, but the SMS could not be sent just now.";
    default:
      return "Resent. SMS sending is switched off, so no SMS went out.";
  }
}
