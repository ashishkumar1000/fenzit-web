import { describe, expect, it } from "bun:test";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { jsonResponse, sentRequests, setRespond } from "../testing/fetchMock";
import {
  lastPageRequest,
  renderAt,
  row,
  standard,
  setUpEmployeesPageTests,
  team,
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
    expect(
      within(dialog).getByText('Turn on "Allow Employee to Create Jobs" first.'),
    ).toBeInTheDocument();
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
    fireEvent.click(within(meera).getByRole("button", { name: "Send Invitation Again" }));
    expect(
      await within(meera).findByText("Invitation sent again successfully."),
    ).toBeInTheDocument();
    expect(
      within(meera).getByRole("button", { name: "Send Invitation Again" }),
    ).toBeInTheDocument();
  });
});

describe("Employees: sortable headers", () => {
  it("shows the default sort as descending, and a click moves to the other direction", async () => {
    renderAt("/admin/company/employees");
    await screen.findByText("Asha V");
    const joined = screen.getByRole("columnheader", { name: /Joined On/ });
    expect(joined.getAttribute("aria-sort")).toBe("descending");
    fireEvent.click(within(joined).getByRole("link"));
    await waitFor(() => expect(lastPageRequest().searchParams.get("sort")).toBe("joined_old"));
    await waitFor(() =>
      expect(
        screen.getByRole("columnheader", { name: /Joined On/ }).getAttribute("aria-sort"),
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
    expect(
      screen.getByRole("columnheader", { name: /Employee Code/ }).getAttribute("aria-sort"),
    ).toBe("none");
  });
});

describe("Employees: the page heading", () => {
  it("shows exactly one level-one heading, the page's own", async () => {
    renderAt("/admin/company/employees");
    await screen.findByText("Asha V");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });
});

describe("Employees: the invite dialog's optional reporting manager", () => {
  const VIEWER_ID = "11111111-1111-4111-8111-111111111111";

  const INVITE_OK = jsonResponse({
    invite_id: "inv-1",
    employee_code: "EMP-009",
    sms_status: "sent",
  });

  function sentInvite(): { body: Record<string, unknown> } | undefined {
    return sentRequests().find((request) => request.url.endsWith("/auth/invite")) as
      { body: Record<string, unknown> } | undefined;
  }

  async function openInvite(): Promise<HTMLDialogElement> {
    renderAt("/admin/company/employees");
    await screen.findByText("Asha V");
    fireEvent.click(screen.getByRole("button", { name: "Invite Employee" }));
    return document.querySelector("dialog[open]") as HTMLDialogElement;
  }

  function fill(dialog: HTMLDialogElement): void {
    fireEvent.change(within(dialog).getByLabelText("Employee Name"), {
      target: { value: "Meera" },
    });
    fireEvent.change(within(dialog).getByLabelText("Phone Number"), {
      target: { value: "9812345678" },
    });
  }

  it("posts managerId only when a manager is chosen", async () => {
    setRespond((url) => (url.endsWith("/auth/invite") ? INVITE_OK : standard(url)));
    const dialog = await openInvite();
    // Before picking, the field reads its honest default and the helper says why.
    expect(within(dialog).getByRole("button", { name: "Not set" })).toBeInTheDocument();
    expect(within(dialog).getByText("Optional. You can change this later.")).toBeInTheDocument();
    fill(dialog);
    fireEvent.click(within(dialog).getByRole("button", { name: "Send Invitation" }));
    await waitFor(() => expect(sentInvite()).toBeDefined());
    expect(sentInvite()?.body).not.toHaveProperty("managerId");
  });

  it("carries the chosen manager and the picker's role word", async () => {
    // The wire ids are UUIDs; a readable fixture id would be refused by the
    // action's shape guard before any POST (that guard has its own test).
    const vikas = row(VIEWER_ID, "Vikas T", "viewer", "active");
    team.rows = [...team.rows.filter((r) => r.userId !== "u-v"), vikas];
    setRespond((url) => (url.endsWith("/auth/invite") ? INVITE_OK : standard(url)));
    const dialog = await openInvite();
    fireEvent.click(within(dialog).getByRole("button", { name: "Not set" }));
    const search = within(dialog).getByLabelText("Search your team");
    fireEvent.change(search, { target: { value: "Vikas" } });
    // The viewer is offered with the role word, never a database slug.
    expect(within(dialog).getByText(`E-${VIEWER_ID} · Viewer`)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByLabelText(/Vikas T/));
    // D13: the viewer note is a neutral fact, shown before anything saves.
    expect(
      within(dialog).getByText(
        "Viewers can't normally see leave or job requests. As a reporting manager, they will see their team's and can decide them.",
      ),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Vikas T" })).toBeInTheDocument();
    fill(dialog);
    fireEvent.click(within(dialog).getByRole("button", { name: "Send Invitation" }));
    await waitFor(() => expect(sentInvite()).toBeDefined());
    expect(sentInvite()?.body).toMatchObject({ managerId: VIEWER_ID });
  });

  it("keeps the roster failure honest and still lets the invite go without a manager", async () => {
    setRespond((url) => {
      const path = new URL(url, "http://localhost").pathname;
      if (path.endsWith("/members")) {
        return jsonResponse({ error_code: "INTERNAL_SERVER_ERROR", message: "boom" }, 500);
      }
      if (path.endsWith("/auth/invite")) return INVITE_OK;
      return standard(url);
    });
    const dialog = await openInvite();
    const row = within(dialog).getByRole("button", { name: "Not set" });
    // The row stays reachable so the picker's own Try Again can be used; the
    // hint still says why the roster is missing.
    expect(row).toBeEnabled();
    expect(within(dialog).getByText("Reports to can't be set right now.")).toBeInTheDocument();
    fireEvent.click(row);
    expect(within(dialog).getByText("We could not load your team. Try again.")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Try Again" })).toBeInTheDocument();
    fill(dialog);
    fireEvent.click(within(dialog).getByRole("button", { name: "Send Invitation" }));
    await waitFor(() => expect(sentInvite()).toBeDefined());
    expect(sentInvite()?.body).not.toHaveProperty("managerId");
  });

  it("shows the mapped refusal verbatim and keeps the dialog open", async () => {
    team.rows = [
      ...team.rows.filter((r) => r.userId !== "u-v"),
      row(VIEWER_ID, "Vikas T", "viewer", "active"),
    ];
    setRespond((url) => {
      if (url.endsWith("/auth/invite"))
        return jsonResponse({ error_code: "MANAGER_NOT_ACTIVE", message: "developer text" }, 422);
      return standard(url);
    });
    const dialog = await openInvite();
    fireEvent.click(within(dialog).getByRole("button", { name: "Not set" }));
    fireEvent.click(within(dialog).getByLabelText(/Vikas T/));
    fill(dialog);
    fireEvent.click(within(dialog).getByRole("button", { name: "Send Invitation" }));
    expect(
      await within(dialog).findByText(
        "That person is not an active member of the company, so they cannot be a reporting manager.",
      ),
    ).toBeInTheDocument();
    expect(dialog.open).toBe(true);
  });

  it("Enter in the picker's search filters, never sends the invitation", async () => {
    setRespond((url) => (url.endsWith("/auth/invite") ? INVITE_OK : standard(url)));
    const dialog = await openInvite();
    // Fill the form first: without a name and a phone the send button is
    // disabled, so an empty form could never prove anything about Enter.
    fill(dialog);
    fireEvent.click(within(dialog).getByRole("button", { name: "Not set" }));
    const search = within(dialog).getByLabelText("Search your team");
    fireEvent.change(search, { target: { value: "Vikas" } });
    // The search filtered, so this is a live list and not an empty one.
    expect(within(dialog).getByLabelText(/Vikas T/)).toBeInTheDocument();
    expect(within(dialog).queryByLabelText(/Bunty R/)).toBeNull();
    // Cancelled at the source, so the invite form around it never submits.
    expect(fireEvent.keyDown(search, { key: "Enter" })).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(sentInvite()).toBeUndefined();
  });
});
