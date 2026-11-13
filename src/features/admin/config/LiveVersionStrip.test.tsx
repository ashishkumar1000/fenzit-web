import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { LiveVersionStrip } from "./LiveVersionStrip";

afterEach(cleanup);

describe("LiveVersionStrip", () => {
  it("shows the Android chip and the version live on Google Play", () => {
    render(<LiveVersionStrip live="1.4.3" />);

    expect(screen.getByText("Android")).toBeTruthy();
    expect(screen.getByText("Live on Google Play")).toBeTruthy();
    expect(screen.getByText("1.4.3")).toBeTruthy();
  });

  it("says the check failed when the server could not reach Google Play", () => {
    render(<LiveVersionStrip live={null} />);

    expect(screen.getByRole("status").textContent).toContain(
      "Could not check the live version on Google Play",
    );
  });

  it("says the version is not shown yet when the server sends no field (older server)", () => {
    render(<LiveVersionStrip live={undefined} />);

    expect(screen.getByRole("status").textContent).toContain("The live version is not shown yet.");
    expect(screen.getByRole("status").textContent).not.toContain("Could not check");
  });
});

describe("LiveVersionStrip — an empty string", () => {
  it("does not show an empty version; it says the version is not shown yet", () => {
    render(<LiveVersionStrip live="" />);

    expect(screen.getByRole("status").textContent).toContain("The live version is not shown yet.");
    expect(screen.getByRole("status").textContent).not.toContain("Live on Google Play");
  });
});
