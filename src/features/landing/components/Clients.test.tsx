import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { Clients } from "./Clients";

afterEach(cleanup);

const CLIENTS = [
  ["Surya College", "Chhattisgarh"],
  ["Raj Electronics", "Bihar"],
  ["Crown International", "Hyderabad"],
  ["Surya International School", "Jagdalpur"],
  ["Master Mind", "Jharkhand"],
  ["Pearl", "New Delhi"],
  ["Aircool Airconditioners", "New Delhi"],
  ["Fem Pharma", "New Delhi"],
  ["Zuba Spirits", "Mumbai"],
] as const;

describe("Clients", () => {
  it("shows the heading and every client with its city", () => {
    render(<Clients />);

    expect(
      screen.getByRole("heading", { name: "Trusted by growing businesses" }),
    ).toBeInTheDocument();
    for (const [name, city] of CLIENTS) {
      expect(screen.getAllByText(name).length).toBeGreaterThan(0);
      expect(screen.getAllByText(city).length).toBeGreaterThan(0);
    }
  });

  it("duplicates the strip for the seamless loop but hides the copy from assistive tech", () => {
    const { container } = render(<Clients />);

    const lists = container.querySelectorAll("ul");
    expect(lists).toHaveLength(2);
    expect(lists[0].getAttribute("aria-hidden")).toBeNull();
    expect(lists[1].getAttribute("aria-hidden")).toBe("true");
    for (const [name] of CLIENTS) {
      expect(screen.getAllByText(name)).toHaveLength(2);
    }
  });

  it("keeps the drawn marks decorative so the name stays the accessible label", () => {
    const { container } = render(<Clients />);

    const svgs = container.querySelectorAll("#clients svg");
    expect(svgs).toHaveLength(18);
    for (const svg of svgs) {
      expect(svg.getAttribute("aria-hidden")).toBe("true");
    }
  });
});
