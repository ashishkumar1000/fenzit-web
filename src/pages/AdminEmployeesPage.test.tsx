import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { routes } from "../app/routes";
import { writeSession } from "../services/session";
import {
  clearApiBase,
  installFetchMock,
  jsonResponse,
  restoreFetchMock,
  sentRequests,
  setRespond,
  useApiBase,
} from "../testing/fetchMock";

// The owner's team page (Epic 22, CAP-1): the job-settings control appears on
// employee rows only, its label summarises the two switches, and the dialog
// saves exactly what the checkboxes hold — with the save's busy, saved and
// error states kept inside the dialog that produced them.

beforeAll(() => {
  useApiBase();
});

afterAll(() => {
  clearApiBase();
});

let patchDelay: (() => void) | null = null;
let patchFails: boolean;
let deferPatches: boolean;
let buntySaved: boolean;

beforeEach(() => {
  patchDelay = null;
  patchFails = false;
  deferPatches = false;
  buntySaved = false;
  installFetchMock();
  setRespond(respondDefault);
});

afterEach(() => {
  restoreFetchMock();
  window.localStorage.clear();
  cleanup();
});

function respondDefault(url: string): Response | Promise<Response> {
  if (url.endsWith("/users/me")) {
    return jsonResponse({
      id: "u-owner",
      role: "company_admin",
      name: "Ravi Kumar",
      platformAdmin: false,
      email: null,
      countryCode: "+91",
      phoneNumber: "9900000001",
      employeeCode: null,
      status: "active",
    });
  }
  if (url.endsWith("/members")) {
    // The list reflects the saved switches after the post-action refetch —
    // "show the current value on the employee's record" (CAP-1).
    return jsonResponse([
      member("u-owner", "Ravi Kumar", "company_admin", "active", false, false),
      member("u-a", "Asha V", "employee", "active", true, true),
      member("u-b", "Bunty R", "employee", "active", buntySaved, false),
      member("u-c", "Chitra D", "employee", "active", true, false),
      member("u-v", "Vikas T", "viewer", "active", false, false),
    ]);
  }
  if (url.includes("job-settings")) {
    if (url.includes("/members/u-b/") && !patchFails) buntySaved = true;
    if (patchFails) return jsonResponse({}, 500);
    if (!deferPatches) return jsonResponse({}, 200);
    // A deferred answer keeps the save in flight so the busy state is visible.
    return new Promise((resolve) => {
      patchDelay = () => resolve(jsonResponse({}, 200));
      console.log("DEBUG responder armed, deferPatches:", deferPatches);
    });
  }
  throw new TypeError(`offline in tests: ${url}`);
}

function member(
  userId: string,
  name: string | null,
  role: string,
  status: string,
  canCreateJobs: boolean,
  jobApprovalRequired: boolean,
): Record<string, unknown> {
  return {
    userId,
    name,
    countryCode: "+91",
    phoneNumber: "9800000000",
    employeeCode: "E-1",
    role,
    status,
    createdAt: "2026-01-01T00:00:00Z",
    canCreateJobs,
    jobApprovalRequired,
  };
}

function renderEmployees(): void {
  writeSession({ token: "tok-1", name: "Ravi" });
  const router = createMemoryRouter(routes, { initialEntries: ["/admin/company/employees"] });
  render(<RouterProvider router={router} />);
}

async function openDialog(rowName: string): Promise<HTMLDialogElement> {
  await screen.findByText(rowName);
  const rowEl = screen.getByText(rowName).closest("tr");
  if (rowEl === null) throw new Error(`no row for ${rowName}`);
  const button = within(rowEl as HTMLElement).getByRole("button", {
    name: /Change job settings|Create|Off/,
  });
  fireEvent.click(button);
  const dialog = (rowEl as HTMLElement).querySelector("dialog");
  if (dialog === null) throw new Error(`no dialog in ${rowName}'s row`);
  return dialog;
}

function checkbox(dialog: HTMLDialogElement, name: string): HTMLInputElement {
  const box = dialog.querySelector(`input[name="${name}"]`);
  if (box === null) throw new Error(`no checkbox ${name}`);
  return box as HTMLInputElement;
}

describe("AdminEmployeesPage: who gets the control (CAP-1)", () => {
  it("offers job settings on employee rows only — owner and viewer read em dashes", async () => {
    renderEmployees();
    await screen.findByText("Asha V");
    // The owner's name also shows in the sidebar chip; the row cell is scoped.
    const ownerRow = screen.getByRole("cell", { name: "Ravi Kumar" }).closest("tr");
    expect(within(ownerRow as HTMLElement).queryByRole("button")).toBeNull();
    const viewerRow = screen.getByRole("cell", { name: "Vikas T" }).closest("tr");
    expect(within(viewerRow as HTMLElement).queryByRole("button")).toBeNull();
    const ashaRow = screen.getByRole("cell", { name: "Asha V" }).closest("tr");
    expect(
      within(ashaRow as HTMLElement).getByRole("button", { name: "Create + approval" }),
    ).toBeInTheDocument();
  });

  it("summarises the two switches in the row's label", async () => {
    renderEmployees();
    await screen.findByText("Asha V");
    // Asha: create on + approval on; Bunty: both off.
    const ashaRow = screen.getByText("Asha V").closest("tr") as HTMLElement;
    expect(within(ashaRow).getByRole("button", { name: "Create + approval" })).toBeInTheDocument();
    const buntyRow = screen.getByText("Bunty R").closest("tr") as HTMLElement;
    expect(within(buntyRow).getByRole("button", { name: "Off" })).toBeInTheDocument();
  });
});

describe("AdminEmployeesPage: the settings dialog", () => {
  it("opens with the row's own values and saves exactly the checkboxes", async () => {
    renderEmployees();
    const dialog = await openDialog("Bunty R");
    expect(dialog.open).toBe(true);
    expect(checkbox(dialog, "canCreateJobs").checked).toBe(false);
    expect(checkbox(dialog, "jobApprovalRequired").checked).toBe(false);
    fireEvent.click(checkbox(dialog, "canCreateJobs"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(
        sentRequests().some((r) => r.method === "PATCH" && r.url.includes("/members/u-b/")),
      ).toBe(true),
    );
    patchDelay?.();
    const patch = sentRequests().find((r) => r.method === "PATCH");
    expect(patch?.body).toMatchObject({ canCreateJobs: true, jobApprovalRequired: false });
    expect(await screen.findByText("Saved.")).toBeInTheDocument();
  });

  it("keeps the Save busy while the save is in flight", async () => {
    renderEmployees();
    deferPatches = true;
    const dialog = await openDialog("Asha V");
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    const save = within(dialog).getByRole("button", { name: /Saving…/ }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    // Hold the answer until the save has actually reached the wire, then let
    // it through — the button comes back and the mark appears.
    await waitFor(() => expect(patchDelay).not.toBeNull());
    patchDelay?.();
    await waitFor(() => expect(within(dialog).queryByText("Saved.")).not.toBeNull());
  });

  it("flips the row's label to the saved value after the refetch", async () => {
    renderEmployees();
    const dialog = await openDialog("Bunty R");
    fireEvent.click(checkbox(dialog, "canCreateJobs"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    const row = screen.getByRole("cell", { name: "Bunty R" }).closest("tr") as HTMLElement;
    await waitFor(() =>
      expect(within(row).getByRole("button", { name: "Create" })).toBeInTheDocument(),
    );
  });

  it("does not carry the saved mark into another employee's dialog", async () => {
    renderEmployees();
    const bunty = await openDialog("Bunty R");
    fireEvent.click(within(bunty).getByRole("button", { name: "Save" }));
    await screen.findByText("Saved.");
    // Close Bunty's dialog and open Asha's — her dialog has nothing saved.
    fireEvent.click(within(bunty).getByRole("button", { name: "Cancel" }));
    const asha = await openDialog("Asha V");
    expect(within(asha).queryByText("Saved.")).toBeNull();
  });

  it("summarises create-on-approval-off as Create", async () => {
    renderEmployees();
    await screen.findByText("Asha V");
    const chitraRow = screen.getByRole("cell", { name: "Chitra D" }).closest("tr") as HTMLElement;
    expect(within(chitraRow).getByRole("button", { name: "Create" })).toBeInTheDocument();
  });

  it("shows the empty team line when nobody is on it yet", async () => {
    setRespond((url) => {
      if (url.endsWith("/members")) return jsonResponse([]);
      return respondDefault(url);
    });
    renderEmployees();
    expect(await screen.findByText("Nobody on the team yet.")).toBeInTheDocument();
  });

  it("reports a failed save inside the dialog, not only at page level", async () => {
    renderEmployees();
    patchFails = true;
    const dialog = await openDialog("Bunty R");
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    expect(
      await within(dialog as unknown as HTMLElement).findByText(/Something went wrong/),
    ).toBeInTheDocument();
  });
});
