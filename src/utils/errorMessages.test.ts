import { describe, expect, it } from "bun:test";
import { ApiError } from "../services/api";
import { GENERIC_MESSAGE, SERVER_MESSAGE, messageForError } from "./errorMessages";

describe("messageForError: known codes", () => {
  it.each([
    ["UNAUTHORIZED", /session has ended/i],
    ["INVALID_OTP", /code is not right/i],
    ["OTP_EXPIRED", /has expired/i],
    ["RATE_LIMIT_EXCEEDED", /too many attempts/i],
  ])("maps %s to its own copy", (code, expected) => {
    expect(messageForError(new ApiError(400, "technical", code))).toMatch(expected);
  });
});

describe("messageForError: no leaked developer text", () => {
  it("never shows the technical 'Request failed with status' text for a 4xx", () => {
    const message = messageForError(new ApiError(422, "Request failed with status 422"));

    expect(message).toBe(GENERIC_MESSAGE);
    expect(message).not.toMatch(/status \d+/i);
  });

  it("gives an unknown code the generic message", () => {
    expect(messageForError(new ApiError(409, "x", "SOMETHING_NEW"))).toBe(GENERIC_MESSAGE);
  });

  it("gives a 5xx with no known code the server message", () => {
    expect(messageForError(new ApiError(503, "x"))).toBe(SERVER_MESSAGE);
  });

  it("uses the known code over the status when both are present", () => {
    expect(messageForError(new ApiError(500, "x", "INVALID_OTP"))).toMatch(/code is not right/i);
  });
});

describe("messageForError: no response", () => {
  it("shows the network message for status 0, which is already plain English", () => {
    expect(
      messageForError(
        new ApiError(0, "Could not reach the server. Check your connection and try again."),
      ),
    ).toMatch(/check your connection/i);
  });
});

describe("messageForError: anything that is not an ApiError", () => {
  it("gives the generic message for a plain Error, without its text", () => {
    expect(messageForError(new Error("TypeError: x is undefined"))).toBe(GENERIC_MESSAGE);
  });

  it("gives the generic message for a thrown string", () => {
    expect(messageForError("boom")).toBe(GENERIC_MESSAGE);
  });
});
