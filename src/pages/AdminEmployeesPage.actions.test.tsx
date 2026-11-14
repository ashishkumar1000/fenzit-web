import { describe, expect, it } from "bun:test";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { jsonResponse, setRespond } from "../testing/fetchMock";
import {
  renderAt,
  row,
  standard,
  team,
  setUpEmployeesPageTests,
} from "../testing/employeesPageKit";

// The Employees page's actions: the invite dialog's send rules (boundaries on
// the name and phone) and the Download list file (encoding, formula safety,
// and the failure paths).

setUpEmployeesPageTests();

describe("Employees: the invite dialog's send rules", () => {
  async function openInvite(): Promise<{
    send: HTMLButtonElement;
    name: HTMLInputElement;
    phone: HTMLInputElement;
  }> {
    renderAt("/admin/company/employees");
    await screen.findByText("Asha V");
    fireEvent.click(screen.getByRole("button", { name: "Invite employee" }));
    const dialog = document.querySelector("dialog") as HTMLDialogElement;
    const send = within(dialog).getByRole("button", { name: "Send invite" }) as HTMLButtonElement;
    const name = within(dialog).getByLabelText("Name") as HTMLInputElement;
    const phone = within(dialog).getByLabelText("Phone number") as HTMLInputElement;
    return { send, name, phone };
  }

  it("keeps Send off and says why when the name is empty", async () => {
    const { send, name, phone } = await openInvite();
    expect(send.disabled).toBe(true);
    expect(screen.getByText("Enter the employee's name to send the invite.")).toBeInTheDocument();
    fireEvent.change(phone, { target: { value: "9812345678" } });
    expect(send.disabled).toBe(true);
    fireEvent.change(name, { target: { value: "   " } });
    expect(send.disabled).toBe(true);
  });

  it.each([
    ["12345", true],
    ["123456", false],
    ["123456789012345", false],
  ])("phone of length %s: send disabled=%s", async (digits, disabled) => {
    const { send, name, phone } = await openInvite();
    fireEvent.change(name, { target: { value: "Meera" } });
    fireEvent.change(phone, { target: { value: digits } });
    expect(send.disabled).toBe(disabled);
  });

  it("strips letters from the phone and counts only the digits left", async () => {
    const { send, name, phone } = await openInvite();
    fireEvent.change(name, { target: { value: "Meera" } });
    fireEvent.change(phone, { target: { value: "98-00 ab" } });
    expect(phone.value).toBe("9800");
    expect(send.disabled).toBe(true);
    expect(
      screen.getByText("Enter a phone number of 6 to 15 digits to send the invite."),
    ).toBeInTheDocument();
  });
});

describe("Employees: Download list", () => {
  function captureBlobs(): Blob[] {
    const blobs: Blob[] = [];
    URL.createObjectURL = (blob: Blob | MediaSource) => {
      blobs.push(blob as Blob);
      return "blob:test";
    };
    URL.revokeObjectURL = () => {};
    return blobs;
  }

  it("writes a UTF-8 byte-order mark, the header, and escaped, formula-safe cells", async () => {
    team.rows = [
      row("u-1", '=HYPERLINK("x")', "company_admin", "active", false, false, "a@b.co"),
      row("u-2", 'Meera "Mee" K', "employee", "invited"),
    ];
    const blobs = captureBlobs();
    renderAt("/admin/company/employees");
    await screen.findByText('Meera "Mee" K');
    fireEvent.click(screen.getByRole("button", { name: "Download list" }));
    await waitFor(() => expect(blobs.length).toBe(1));
    const text = await blobs[0].text();
    expect(text.charCodeAt(0)).toBe(0xfeff);
    const [header, first, second] = text.slice(1).split("\n");
    expect(header).toBe("Name,Email,Phone,Code,Role,Status,Joined");
    expect(first).toContain(`"'=HYPERLINK(""x"")"`);
    expect(first).toContain(`"Owner"`);
    expect(second).toContain(`"Meera ""Mee"" K"`);
    expect(second).toContain(`"Invited"`);
    expect(second).toContain(`"Jan 01, 2026"`);
  });

  it("shows an error, not a silent no-op, when the team cannot be fetched", async () => {
    setRespond((url) => {
      const parsed = new URL(url, "http://localhost");
      if (parsed.pathname.endsWith("/members") && !parsed.pathname.endsWith("/page")) {
        return jsonResponse({}, 500);
      }
      return standard(url);
    });
    captureBlobs();
    renderAt("/admin/company/employees");
    await screen.findByText("Asha V");
    fireEvent.click(screen.getByRole("button", { name: "Download list" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The file could not be created. Try again.",
    );
  });

  it("shows an error when the session is gone, instead of doing nothing", async () => {
    captureBlobs();
    renderAt("/admin/company/employees");
    await screen.findByText("Asha V");
    window.localStorage.clear();
    fireEvent.click(screen.getByRole("button", { name: "Download list" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The file could not be created. Try again.",
    );
  });
});
