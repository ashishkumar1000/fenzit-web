import { describe, expect, it } from "bun:test";
import { checkPhone } from "./contactValidation";

describe("checkPhone: blank input means no phone", () => {
  it.each([
    ["an empty box", ""],
    ["only spaces", "   "],
    ["only separators", " - ( ) . "],
  ])("returns none for %s", (_label, national) => {
    expect(checkPhone("+91", national)).toEqual({ kind: "none" });
  });
});

describe("checkPhone: joins the dial code and the typed number", () => {
  it.each([
    ["an Indian mobile with a space", "+91", "98765 43210", "+919876543210"],
    ["separators are ignored", "+91", "(98765) 43210", "+919876543210"],
    ["a hyphenated number", "+44", "7911-123456", "+447911123456"],
    ["a US number", "+1", "2025550123", "+12025550123"],
    ["the shortest total length allowed (7 digits)", "+1", "234567", "+1234567"],
    ["the longest total length allowed (15 digits)", "+1", "2".repeat(14), `+1${"2".repeat(14)}`],
  ])("accepts %s", (_label, dialCode, national, expected) => {
    expect(checkPhone(dialCode, national)).toEqual({ kind: "valid", phone: expected });
  });
});

describe("checkPhone: rejects what the dropdown should have handled", () => {
  it.each([
    ["a plus sign typed into the number", "+44", "+44 7911 123456"],
    ["a 00 prefix typed into the number", "+91", "0091 98765 43210"],
    ["letters", "+91", "98765 abcde"],
    ["too few digits for a total number", "+1", "12"],
    ["more than 15 digits in total", "+1", "9".repeat(15)],
    ["a dial code with a stray character", "+9 1", "98765 43210"],
    ["a national trunk zero (UK 07911)", "+44", "07911 123456"],
    ["a national trunk zero (India 098765)", "+91", "098765 43210"],
    ["too few digits in total (6)", "+1", "23456"],
    ["a dial code that starts with zero", "+0", "98765 43210"],
  ])("rejects %s", (_label, dialCode, national) => {
    expect(checkPhone(dialCode, national)).toEqual({ kind: "invalid" });
  });
});
