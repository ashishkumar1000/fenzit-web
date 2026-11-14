import { describe, expect, it } from "bun:test";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { jsonResponse, setRespond } from "../testing/fetchMock";
import {
  lastPageRequest,
  renderAt,
  standard,
  setUpEmployeesPageTests,
} from "../testing/employeesPageKit";

// The Employees page's dialogs and controls: the approval switch that waits on
// "Can create jobs", the filter dropdown's apply and clear, the Resend link
// that stays usable, the sortable headers, and the page's single heading.

setUpEmployeesPageTests();

describe("Employees: the job settings dialog", () => {
  it("disables Approval needed while Can create jobs is off, and saves it as off", async () => {
    renderAt("/admin/company/employees");
    const bunty = (await screen.findByText("Bunty R")).closest("tr") as HTMLElement;
    fireEvent.click(within(bunty).getByRole("button", { name: "Off" }));
    // The row's own settings dialog holds these switches (the invite dialog does not).
    const create = document.querySelector(
      'dialog[open] input[name="canCreateJobs"]',
    ) as HTMLInputElement;
    const dialog = create.closest("dialog") as HTMLDialogElement;
    const approval = dialog.querySelector('input[name="jobApprovalRequired"]') as HTMLInputElement;
    expect(create.checked).toBe(false);
    expect(approval.disabled).toBe(true);
    expect(within(dialog).getByText("Turn on Can create jobs first.")).toBeInTheDocument();
    fireEvent.click(create);
    expect(approval.disabled).toBe(false);
  });
});

describe("Employees: the filter dropdown", () => {
  it("applies the chosen role to the address", async () => {
    renderAt("/admin/company/employees");
    await screen.findByText("Asha V");
    fireEvent.click(screen.getByRole("button", { name: /^Role/ }));
    fireEvent.click(screen.getByRole("option", { name: /^Viewer/ }));
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    await waitFor(() => expect(lastPageRequest().searchParams.get("role")).toBe("viewer"));
  });

  it("clears a chosen role when its selected option is clicked again", async () => {
    renderAt("/admin/company/employees?role=viewer");
    await screen.findByText("Vikas T");
    fireEvent.click(screen.getByRole("button", { name: /^Role/ }));
    fireEvent.click(screen.getByRole("option", { name: /^Viewer/ }));
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    await waitFor(() => expect(lastPageRequest().searchParams.get("role")).toBeNull());
  });
});

describe("Employees: the Resend link", () => {
  it("keeps Resend invite usable after a successful resend", async () => {
    setRespond((url) => {
      if (url.includes("/resend-sms")) return jsonResponse({ sms_status: "sent" });
      return standard(url);
    });
    renderAt("/admin/company/employees");
    const meera = (await screen.findByText("Meera Joshi")).closest("tr") as HTMLElement;
    fireEvent.click(within(meera).getByRole("button", { name: "Resend invite" }));
    expect(await within(meera).findByText("Invite resent.")).toBeInTheDocument();
    expect(within(meera).getByRole("button", { name: "Resend invite" })).toBeInTheDocument();
  });
});

describe("Employees: sortable headers", () => {
  it("shows the default sort as descending, and a click moves to the other direction", async () => {
    renderAt("/admin/company/employees");
    await screen.findByText("Asha V");
    const joined = screen.getByRole("columnheader", { name: /Joined on/ });
    expect(joined.getAttribute("aria-sort")).toBe("descending");
    fireEvent.click(within(joined).getByRole("link"));
    await waitFor(() => expect(lastPageRequest().searchParams.get("sort")).toBe("joined_old"));
    await waitFor(() =>
      expect(
        screen.getByRole("columnheader", { name: /Joined on/ }).getAttribute("aria-sort"),
      ).toBe("ascending"),
    );
  });

  it("starts a name sort ascending and reports no sort on other columns", async () => {
    renderAt("/admin/company/employees");
    await screen.findByText("Asha V");
    fireEvent.click(within(screen.getByRole("columnheader", { name: /^Name/ })).getByRole("link"));
    await waitFor(() => expect(lastPageRequest().searchParams.get("sort")).toBe("name_az"));
    await waitFor(() =>
      expect(screen.getByRole("columnheader", { name: /^Name/ }).getAttribute("aria-sort")).toBe(
        "ascending",
      ),
    );
    expect(screen.getByRole("columnheader", { name: /Code/ }).getAttribute("aria-sort")).toBe(
      "none",
    );
  });
});

describe("Employees: the page heading", () => {
  it("shows exactly one level-one heading, the page's own", async () => {
    renderAt("/admin/company/employees");
    await screen.findByText("Asha V");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });
});
