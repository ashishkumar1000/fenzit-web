import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SavingsCalculator } from "./SavingsCalculator";

afterEach(cleanup);

function slider(): HTMLInputElement {
  return screen.getByRole("slider") as HTMLInputElement;
}

describe("SavingsCalculator", () => {
  it("starts at 25 members with the matching hours and plan", () => {
    render(<SavingsCalculator />);

    expect(screen.getByText("25 members")).toBeInTheDocument();
    expect(screen.getByText("62 hrs/mo")).toBeInTheDocument();
    expect(screen.getByText("Growth")).toBeInTheDocument();
  });

  it("labels the slider and announces its value with the unit", () => {
    render(<SavingsCalculator />);

    const named = screen.getByRole("slider", { name: "Field staff" });
    expect(named.getAttribute("aria-valuetext")).toBe("25 members");
  });

  it("has its slider bounded to 5 and 250", () => {
    render(<SavingsCalculator />);

    expect(slider().min).toBe("5");
    expect(slider().max).toBe("250");
  });

  it("updates the hours and plan when the slider moves, at the band edges", () => {
    render(<SavingsCalculator />);

    fireEvent.change(slider(), { target: { value: "5" } });
    expect(screen.getByText("5 members")).toBeInTheDocument();
    expect(screen.getByText("12 hrs/mo")).toBeInTheDocument();
    expect(screen.getByText("Starter")).toBeInTheDocument();

    fireEvent.change(slider(), { target: { value: "76" } });
    expect(screen.getByText("Large teams")).toBeInTheDocument();

    fireEvent.change(slider(), { target: { value: "250" } });
    expect(screen.getByText("620 hrs/mo")).toBeInTheDocument();
  });
});
