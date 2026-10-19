import { afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import type { CountryCode } from "../countryCodes";
import { earlyAccessAction } from "../earlyAccessAction";
import { NotifyForm } from "./NotifyForm";

const COUNTRIES: CountryCode[] = [
  { dialCode: "+91", countryName: "India", iso2: "IN" },
  { dialCode: "+44", countryName: "United Kingdom", iso2: "GB" },
  { dialCode: "+1", countryName: "United States", iso2: "US" },
];

type SentRequest = { url: string; body: unknown };

let sent: SentRequest[] = [];
let respond: () => Promise<Response> = () => Promise.resolve(savedResponse());
const originalFetch = globalThis.fetch;

beforeAll(() => {
  // The action calls fenzit-be through apiFetch, which reads the build's base URL.
  process.env.VITE_API_BASE_URL = "https://api.test.example";
});

beforeEach(() => {
  sent = [];
  respond = () => Promise.resolve(savedResponse());
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    sent.push({
      url: String(input),
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    return respond();
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  cleanup();
});

function savedResponse(reference = "FZ-3F9A0C21"): Response {
  return new Response(
    JSON.stringify({ message: "Thanks. We will email you when access opens.", reference }),
    { status: 202, headers: { "Content-Type": "application/json" } },
  );
}

function errorResponse(status: number, errorCode: string): Response {
  return new Response(JSON.stringify({ error_code: errorCode, message: "x" }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Renders the form inside a real router, with the loader and action the app uses. */
async function renderForm(countries: CountryCode[] = COUNTRIES) {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: <NotifyForm />,
        loader: () => ({ countryCodes: countries }),
        action: earlyAccessAction,
      },
    ],
    { initialEntries: ["/"] },
  );
  render(<RouterProvider router={router} />);
  await screen.findByLabelText("Email address");
}

function emailInput(): HTMLInputElement {
  return screen.getByLabelText("Email address") as HTMLInputElement;
}

function countrySelect(): HTMLSelectElement {
  return screen.getByLabelText("Country code") as HTMLSelectElement;
}

function phoneInput(): HTMLInputElement {
  return screen.getByLabelText("Phone number without country code") as HTMLInputElement;
}

function clickJoin() {
  fireEvent.click(screen.getByRole("button", { name: /join early access/i }));
}

async function submit({ email = "you@company.com", phone }: { email?: string; phone?: string }) {
  fireEvent.change(emailInput(), { target: { value: email } });
  if (phone !== undefined) {
    fireEvent.change(phoneInput(), { target: { value: phone } });
  }
  clickJoin();
}

describe("NotifyForm: country code dropdown", () => {
  it("starts on India (+91)", async () => {
    await renderForm();

    expect(countrySelect().value).toBe("+91");
  });

  it("lists every country from the loader with its dial code", async () => {
    await renderForm();

    const labels = Array.from(countrySelect().querySelectorAll("option")).map(
      (option) => option.textContent,
    );
    expect(labels).toEqual(["India (+91)", "United Kingdom (+44)", "United States (+1)"]);
  });

  it("falls back to India alone when the loader gives no countries", async () => {
    await renderForm([{ dialCode: "+91", countryName: "India", iso2: "IN" }]);

    expect(countrySelect().value).toBe("+91");
    expect(countrySelect().querySelectorAll("option")).toHaveLength(1);
  });
});

describe("NotifyForm: rejects malformed email addresses", () => {
  it.each([
    ["empty", ""],
    ["only spaces", "   "],
    ["no @", "plainaddress"],
    ["no domain dot", "a@b"],
    ["space inside the address", "a b@c.com"],
    ["two @ signs", "a@@b.com"],
    ["no local part", "@b.com"],
    ["dot at the end", "a@b."],
    ["two dots in a row in the domain", "a@b..c.com"],
    ["two dots in a row in the local part", "a..b@c.com"],
    ["a leading dot in the local part", ".a@b.com"],
    ["a trailing dot in the local part", "a.@b.com"],
    ["a domain label that starts with a dot", "a@.b.com"],
    ["an address over 254 characters", `${"a".repeat(249)}@b.com`],
  ])("shows the error and sends nothing for %s", async (_label, value) => {
    await renderForm();

    await submit({ email: value });

    expect(await screen.findByText("Please enter a valid email address.")).toBeInTheDocument();
    expect(emailInput()).toHaveAttribute("aria-invalid", "true");
    expect(sent).toHaveLength(0);
  });
});

describe("NotifyForm: accepts valid email addresses", () => {
  it.each([
    ["a plus address", "a+b@c.com"],
    ["a dotted local part", "first.last@c.com"],
    ["a multi-level domain", "a@mail.example.co.in"],
    ["an address at exactly 254 characters", `${"a".repeat(248)}@b.com`],
  ])("sends %s to the API", async (_label, value) => {
    await renderForm();

    await submit({ email: value });

    expect(await screen.findByText(/on the list/i)).toBeInTheDocument();
    expect(sent).toHaveLength(1);
    expect(sent[0].body).toMatchObject({ email: value });
  });

  it("trims surrounding spaces before it sends the address", async () => {
    await renderForm();

    await submit({ email: "   you@company.com   " });

    expect(await screen.findByText(/on the list/i)).toBeInTheDocument();
    expect(sent[0].body).toMatchObject({ email: "you@company.com" });
  });

  it("posts to the early-access endpoint on the configured base URL", async () => {
    await renderForm();

    await submit({ email: "you@company.com" });

    await screen.findByText(/on the list/i);
    expect(sent[0].url).toBe("https://api.test.example/api/v1/early-access");
  });
});

describe("NotifyForm: phone numbers", () => {
  it("sends India's code joined to the typed number", async () => {
    await renderForm();

    await submit({ phone: "98765 43210" });

    await screen.findByText(/on the list/i);
    expect(sent[0].body).toMatchObject({ phone: "+919876543210" });
  });

  it("sends the code the visitor picked, not India's", async () => {
    await renderForm();
    fireEvent.change(countrySelect(), { target: { value: "+44" } });

    await submit({ phone: "7911 123456" });

    await screen.findByText(/on the list/i);
    expect(sent[0].body).toMatchObject({ phone: "+447911123456" });
  });

  it("sends no phone field when the phone box is empty", async () => {
    await renderForm();

    await submit({ phone: "" });

    await screen.findByText(/on the list/i);
    expect(sent[0].body).not.toHaveProperty("phone");
  });

  it.each([
    ["the number carries its own plus sign", "+44 7911 123456"],
    ["the number carries a 00 prefix", "0044 7911 123456"],
    ["the number has letters", "98765 abcde"],
    ["the number is too short", "12"],
    ["the number is too long", "9".repeat(20)],
    ["the number starts with a trunk zero", "07911 123456"],
  ])("rejects a phone where %s, and sends nothing", async (_label, phone) => {
    await renderForm();

    await submit({ phone });

    expect(await screen.findByText(/Type the number after the country code/)).toBeInTheDocument();
    expect(phoneInput()).toHaveAttribute("aria-invalid", "true");
    expect(sent).toHaveLength(0);
  });
});

describe("NotifyForm: results from the API", () => {
  it("shows the reference the API returns", async () => {
    await renderForm();

    await submit({ email: "you@company.com" });

    expect(await screen.findByText("FZ-3F9A0C21")).toBeInTheDocument();
    expect(screen.getByText(/we'll email you@company\.com when access opens/i)).toBeInTheDocument();
  });

  it("shows a retry message when the server fails, and keeps what was typed", async () => {
    respond = () => Promise.resolve(errorResponse(500, "INTERNAL_ERROR"));
    await renderForm();

    await submit({ email: "you@company.com", phone: "98765 43210" });

    expect(
      await screen.findByText("Something went wrong on our side. Try again in a moment."),
    ).toBeInTheDocument();
    expect(emailInput().value).toBe("you@company.com");
    expect(phoneInput().value).toBe("98765 43210");
    expect(screen.queryByText(/on the list/i)).toBeNull();
  });

  it("shows the validation message when the server rejects the input", async () => {
    respond = () => Promise.resolve(errorResponse(422, "VALIDATION_ERROR"));
    await renderForm();

    await submit({ email: "you@company.com" });

    expect(
      await screen.findByText("Check the highlighted fields and try again."),
    ).toBeInTheDocument();
  });

  it("disables the button and says so while the request is in flight", async () => {
    let finish: (response: Response) => void = () => {};
    respond = () => new Promise<Response>((resolve) => (finish = resolve));
    await renderForm();

    await submit({ email: "you@company.com" });

    const button = await screen.findByRole("button", { name: "Joining…" });
    expect((button as HTMLButtonElement).disabled).toBe(true);

    finish(savedResponse());
    expect(await screen.findByText(/on the list/i)).toBeInTheDocument();
  });
});

it("clears the error as soon as the visitor edits the email field", async () => {
  await renderForm();
  await submit({ email: "bad" });
  expect(await screen.findByText("Please enter a valid email address.")).toBeInTheDocument();

  fireEvent.change(emailInput(), { target: { value: "bad@" } });

  await waitFor(() => expect(emailInput()).toHaveAttribute("aria-invalid", "false"));
  expect(screen.getByRole("status")).toHaveTextContent(
    "We'll only email you about early access. No spam.",
  );
});
