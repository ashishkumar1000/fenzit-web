import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { LookupFacts } from "./LookupScene";

afterEach(cleanup);

// The records a match shows. The list must name each one in plain words.
describe("LookupFacts", () => {
  it("lists the seven kinds of record a match shows, in plain words", () => {
    render(<LookupFacts />);
    const items = screen.getAllByRole("listitem").map((item) => item.textContent);
    expect(items).toEqual([
      "Companies",
      "Jobs",
      "Attendance",
      "Leave",
      "Invitations",
      "Notifications",
      "Past changes",
    ]);
  });
});
