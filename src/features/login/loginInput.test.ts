import { describe, expect, it } from "bun:test";
import { classifyIdentifier, formatPhoneLabel, INDIA_ONLY_MESSAGE } from "./loginInput";

describe("classifyIdentifier: empty input", () => {
  it.each(["", "   ", "\t\n"])("treats %j as empty", (raw) => {
    expect(classifyIdentifier(raw)).toEqual({ kind: "empty" });
  });
});

describe("classifyIdentifier: email path", () => {
  it("takes a value with an @ as an email and lowercases it", () => {
    expect(classifyIdentifier("Mona@Gmail.Com")).toEqual({
      kind: "email",
      email: "mona@gmail.com",
    });
  });

  it("trims spaces around the email", () => {
    expect(classifyIdentifier("  mona@gmail.com  ")).toEqual({
      kind: "email",
      email: "mona@gmail.com",
    });
  });

  it.each([
    ["mona@gmail.com", "the shortest useful address"],
    ["a.b+c@mail.example.co.in", "dots, plus and a long domain"],
    ["o'brien@example.com", "an apostrophe, which RFC 5322 allows"],
  ])("accepts %j (%s)", (email) => {
    expect(classifyIdentifier(email)).toEqual({ kind: "email", email });
  });

  it.each([
    ["mona@gmail", "no dot in the domain"],
    ["mona@gmail.c", "a one-letter domain"],
    ["mona@.com", "a domain with no name"],
    ["mona@gmail..com", "a doubled dot"],
    [".mona@gmail.com", "a leading dot"],
    ["mona.@gmail.com", "a trailing dot in the name"],
    ["mo na@gmail.com", "a space in the name"],
    ["mona@exa mple.com", "a space in the domain"],
    ["mona@-gmail.com", "a domain label starting with a hyphen"],
    [`${"a".repeat(249)}@b.com`, "255 characters, one over the cap"],
  ])("refuses %j (%s)", (email) => {
    expect(classifyIdentifier(email)).toEqual({
      kind: "invalid",
      message: "Enter a valid email address.",
    });
  });

  it("accepts an address of exactly 254 characters, the RFC 5321 cap", () => {
    const email = `${"a".repeat(248)}@b.com`;
    expect(classifyIdentifier(email)).toEqual({ kind: "email", email });
  });
});

describe("classifyIdentifier: phone path", () => {
  it.each(["6123456789", "7123456789", "8123456789", "9123456789"])(
    "accepts a 10-digit mobile starting with %s",
    (phoneNumber) => {
      expect(classifyIdentifier(phoneNumber)).toEqual({
        kind: "phone",
        dialCode: "+91",
        phoneNumber,
        label: formatPhoneLabel("+91", phoneNumber),
      });
    },
  );

  it("ignores spaces, dashes, brackets and dots in the number", () => {
    expect(classifyIdentifier("98765 43210")).toMatchObject({
      kind: "phone",
      phoneNumber: "9876543210",
    });
    expect(classifyIdentifier("98765-43210")).toMatchObject({ phoneNumber: "9876543210" });
    expect(classifyIdentifier("(98765) 43210")).toMatchObject({ phoneNumber: "9876543210" });
    expect(classifyIdentifier("98765.43210")).toMatchObject({ phoneNumber: "9876543210" });
  });

  it("accepts a full number pasted with the +91 dial code", () => {
    expect(classifyIdentifier("+91 98765 43210")).toMatchObject({
      phoneNumber: "9876543210",
      label: "+91 98765 43210",
    });
  });

  it("accepts a full number pasted with 91 and no plus sign", () => {
    expect(classifyIdentifier("919876543210")).toMatchObject({ phoneNumber: "9876543210" });
  });

  it.each([
    ["+44 7911 123456", "a UK number"],
    ["+1 415 555 0100", "a US number"],
    ["+971 50 123 4567", "a UAE number"],
  ])("refuses %j (%s) with the India-only message", (raw) => {
    expect(classifyIdentifier(raw)).toEqual({ kind: "invalid", message: INDIA_ONLY_MESSAGE });
  });

  it.each([
    ["5123456789", "starting with 5"],
    ["0123456789", "starting with a trunk 0"],
    ["987654321", "only 9 digits"],
    ["98765432101", "11 digits"],
  ])("refuses %j (%s) with the format hint", (raw) => {
    const result = classifyIdentifier(raw);
    expect(result.kind).toBe("invalid");
    if (result.kind === "invalid") {
      expect(result.message).toMatch(/10-digit mobile number/);
    }
  });

  it("refuses +91 followed by a number with a trunk 0", () => {
    expect(classifyIdentifier("+91 098765 4321").kind).toBe("invalid");
  });

  it("refuses +91 followed by the wrong digit count", () => {
    expect(classifyIdentifier("+91 987654321").kind).toBe("invalid");
    expect(classifyIdentifier("+91 98765432101").kind).toBe("invalid");
  });

  it("refuses digits mixed with letters", () => {
    expect(classifyIdentifier("98765abc210").kind).toBe("invalid");
  });
});

describe("formatPhoneLabel", () => {
  it("groups a 10-digit number in fives for the code step", () => {
    expect(formatPhoneLabel("+91", "9876543210")).toBe("+91 98765 43210");
  });

  it("leaves a number of any other length unchanged", () => {
    expect(formatPhoneLabel("+91", "987654321")).toBe("+91 987654321");
  });
});
