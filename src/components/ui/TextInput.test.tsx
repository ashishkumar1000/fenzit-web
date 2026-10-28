import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { TextInput } from "./TextInput";

afterEach(cleanup);

function renderInput(hideLabel: boolean) {
  return render(
    <TextInput
      id="field"
      name="field"
      label="Phone or email"
      value=""
      onChange={() => {}}
      hideLabel={hideLabel}
    />,
  );
}

describe("TextInput label", () => {
  it("shows the label by default", () => {
    renderInput(false);
    expect(screen.getByLabelText("Phone or email")).toBeTruthy();
  });

  it("keeps the label linked to the input when it is hidden", () => {
    renderInput(true);
    expect(screen.getByLabelText("Phone or email")).toBeTruthy();
  });
});
// The hidden style itself (clipped, out of the layout) is checked in a browser, not here:
// CSS modules have no class names in this test environment.
