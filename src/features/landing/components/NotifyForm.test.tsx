import { describe, expect, it } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import { NotifyForm } from "./NotifyForm";

function submit(value: string) {
  const input = screen.getByLabelText("Email address");
  fireEvent.change(input, { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: /join early access/i }));
}

describe("NotifyForm", () => {
  describe("rejects malformed email addresses", () => {
    it.each([
      ["empty", ""],
      ["only spaces", "   "],
      ["no @", "plainaddress"],
      ["no domain dot", "a@b"],
      ["space inside the address", "a b@c.com"],
      ["two @ signs", "a@@b.com"],
      ["no local part", "@b.com"],
      ["dot at the end", "a@b."],
    ])("shows the error for %s", (_label, value) => {
      render(<NotifyForm />);

      submit(value);

      expect(screen.getByRole("status")).toHaveTextContent("Please enter a valid email address.");
      expect(screen.getByLabelText("Email address")).toHaveAttribute("aria-invalid", "true");
      expect(screen.queryByText(/on the list/i)).toBeNull();
    });
  });

  describe("accepts a valid email address", () => {
    it("shows the confirmation and echoes the address back", () => {
      render(<NotifyForm />);

      submit("you@company.com");

      expect(screen.getByText(/on the list/i)).toBeInTheDocument();
      expect(
        screen.getByText(/we'll email you@company\.com when access opens/i),
      ).toBeInTheDocument();
    });

    it("trims surrounding spaces before it checks and echoes the address", () => {
      render(<NotifyForm />);

      submit("   you@company.com   ");

      expect(
        screen.getByText(/we'll email you@company\.com when access opens/i),
      ).toBeInTheDocument();
    });

    it("accepts a single-letter local part and a multi-level domain", () => {
      render(<NotifyForm />);

      submit("a@mail.example.co.in");

      expect(screen.getByText(/on the list/i)).toBeInTheDocument();
    });
  });

  it("clears the error as soon as the user edits the field", () => {
    render(<NotifyForm />);
    submit("bad");
    expect(screen.getByLabelText("Email address")).toHaveAttribute("aria-invalid", "true");

    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "bad@" },
    });

    expect(screen.getByLabelText("Email address")).toHaveAttribute("aria-invalid", "false");
    expect(screen.getByRole("status")).toHaveTextContent(
      "We'll only email you about early access. No spam.",
    );
  });
});

describe("NotifyForm: email edge cases", () => {
  it.each([
    ["two dots in a row in the domain", "a@b..c.com"],
    ["two dots in a row in the local part", "a..b@c.com"],
    ["a leading dot in the local part", ".a@b.com"],
    ["a trailing dot in the local part", "a.@b.com"],
    ["a domain label that starts with a dot", "a@.b.com"],
    ["an address over 254 characters", `${"a".repeat(249)}@b.com`],
  ])("rejects %s", (_label, value) => {
    render(<NotifyForm />);

    submit(value);

    expect(screen.getByRole("status")).toHaveTextContent("Please enter a valid email address.");
  });

  it.each([
    ["a plus address", "a+b@c.com"],
    ["a dotted local part", "first.last@c.com"],
    ["an address at exactly 254 characters", `${"a".repeat(248)}@b.com`],
  ])("accepts %s", (_label, value) => {
    render(<NotifyForm />);

    submit(value);

    expect(screen.getByText(/on the list/i)).toBeInTheDocument();
  });
});
