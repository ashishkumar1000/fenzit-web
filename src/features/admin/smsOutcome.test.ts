import { describe, expect, it } from "bun:test";
import { resendOutcomeLine, smsOutcome } from "./smsOutcome";

// The owner reads the SMS result on the invite dialog and on the table's row.
// Each status must say its own thing, and an unknown or missing status must
// never claim that sending is switched off unless the status says so.

describe("smsOutcome: the invite dialog", () => {
  it.each([
    ["sent", /went out to their phone/],
    ["refused_cap", /too many messages/],
    ["failed", /could not be sent just now/],
  ])("status %s says its own outcome", (status, expected) => {
    expect(smsOutcome(status)).toMatch(expected);
  });

  it("tells the owner the invite is saved whenever the SMS did not go out", () => {
    for (const status of ["refused_cap", "failed", null, "something_new"]) {
      expect(smsOutcome(status)).toMatch(/invite is saved/);
    }
  });
});

describe("resendOutcomeLine: the table row", () => {
  it.each([
    ["sent", "Invite resent."],
    ["refused_cap", /too many messages/],
    ["failed", /could not be sent just now/],
  ])("status %s says its own outcome", (status, expected) => {
    const line = resendOutcomeLine(status);
    if (typeof expected === "string") expect(line).toBe(expected);
    else expect(line).toMatch(expected);
  });

  it("never reads a failed or capped resend as sent", () => {
    expect(resendOutcomeLine("failed")).not.toBe(resendOutcomeLine("sent"));
    expect(resendOutcomeLine("refused_cap")).not.toBe(resendOutcomeLine("sent"));
  });
});
