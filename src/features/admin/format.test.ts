import { describe, expect, it } from "bun:test";
import { waitLabel } from "./format";

// The wait label a person reads: hours under a day, whole days after — with
// the day count floored, so 36 hours never reads as the two days it has not
// finished being.

describe("waitLabel: the day boundary and the floor", () => {
  it.each([
    [0, "<1 h"],
    [0.5, "<1 h"],
    [1, "1 h"],
    [23, "23 h"],
    [24, "1 d"],
    [25, "1 d"],
    [36, "1 d"],
    [47.9, "1 d"],
    [48, "2 d"],
    [72, "3 d"],
  ])("%s hours reads as %s", (hours, label) => {
    expect(waitLabel(hours)).toBe(label);
  });
});
