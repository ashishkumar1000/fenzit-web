/** What an invite or resend result says about the SMS — the invite itself is
 *  always saved. Null or unknown statuses mean sending is switched off. One
 *  wording for the invite dialog and the table's resend link, so the same
 *  outcome never reads two ways. */
export function smsOutcome(status: string | null): string {
  switch (status) {
    case "sent":
      return "Invitation sent successfully to the employee's phone.";
    case "refused_cap":
      return "Invitation saved, but too many messages have been sent to this number in a short time. Please try again later.";
    case "failed":
      return "Invitation saved, but the SMS could not be sent right now.";
    default:
      return "Invitation saved, but SMS sending is turned off. No SMS was sent.";
  }
}

/** The one-line mark for a resent invite: short on the row, full detail only
 *  in the dialog. */
export function resendOutcomeLine(status: string | null): string {
  switch (status) {
    case "sent":
      return "Invitation sent again successfully.";
    case "refused_cap":
      return "Invitation sent again, but too many messages have been sent to this number. Please try again later.";
    case "failed":
      return "The invitation could not be sent again right now.";
    default:
      return "The invitation could not be sent again. SMS sending is turned off.";
  }
}
