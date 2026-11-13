import { afterEach, describe, expect, it, mock } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MinVersionDialog } from "./MinVersionDialog";

afterEach(cleanup);

describe("MinVersionDialog — version above the live Google Play version", () => {
  function renderAbove(onUseLive = mock(() => {}), onClose = mock(() => {})) {
    render(
      <MinVersionDialog
        refusal={{ kind: "above-live", live: "1.4.3" }}
        enteredValue="1.4.4"
        onUseLive={onUseLive}
        onClose={onClose}
      />,
    );
    return { onUseLive, onClose };
  }

  it("says the version is not on Google Play yet, and names the live version", () => {
    renderAbove();

    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(screen.getByText("This version isn't on Google Play yet")).toBeTruthy();
    expect(screen.getByText(/You entered 1\.4\.4/)).toBeTruthy();
    expect(screen.getByText(/latest version live on Google Play is 1\.4\.3/)).toBeTruthy();
  });

  it("recommends the live version and offers to use it", () => {
    const { onUseLive } = renderAbove();

    fireEvent.click(screen.getByRole("button", { name: "Use 1.4.3" }));

    expect(onUseLive).toHaveBeenCalledWith("1.4.3");
  });

  it("closes without sending anything when the admin keeps their entry", () => {
    const { onUseLive, onClose } = renderAbove();

    fireEvent.click(screen.getByRole("button", { name: "Keep my entry" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onUseLive).not.toHaveBeenCalled();
  });

  it("closes when Escape is pressed", () => {
    const { onClose } = renderAbove();

    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("is labelled by its title and described by its text, for screen readers", () => {
    renderAbove();
    const dialog = screen.getByRole("alertdialog");

    expect(dialog.getAttribute("aria-modal")).toBe("true");
    const title = document.getElementById(dialog.getAttribute("aria-labelledby") ?? "");
    expect(title?.textContent).toBe("This version isn't on Google Play yet");
    const body = document.getElementById(dialog.getAttribute("aria-describedby") ?? "");
    expect(body?.textContent).toContain("1.4.3");
  });
});

describe("MinVersionDialog — version that is not three numbers", () => {
  it("explains the format and offers no live-version button when the live version is not the fix", () => {
    render(
      <MinVersionDialog
        refusal={{ kind: "invalid" }}
        enteredValue="1.4"
        onUseLive={mock(() => {})}
        onClose={mock(() => {})}
      />,
    );

    expect(screen.getByText("Enter a version like 1.4.0")).toBeTruthy();
    expect(screen.getByText(/Use three numbers with dots, like 1\.4\.0/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Use / })).toBeNull();
    expect(screen.getByRole("button", { name: "Keep my entry" })).toBeTruthy();
  });
});

describe("MinVersionDialog — focus and keyboard", () => {
  it("moves focus into the dialog when it opens", () => {
    render(
      <MinVersionDialog
        refusal={{ kind: "above-live", live: "1.4.3" }}
        enteredValue="1.4.4"
        onUseLive={mock(() => {})}
        onClose={mock(() => {})}
      />,
    );

    expect(document.activeElement).toBe(screen.getByRole("alertdialog"));
  });

  it("returns focus to the element that had it before the dialog opened, on Escape", () => {
    const field = document.createElement("button");
    document.body.appendChild(field);
    field.focus();
    const onClose = mock(() => {});
    render(
      <MinVersionDialog
        refusal={{ kind: "above-live", live: "1.4.3" }}
        enteredValue="1.4.4"
        onUseLive={mock(() => {})}
        onClose={onClose}
      />,
    );

    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(field);
    field.remove();
  });

  it("wraps Tab from the last control back to the first, so focus stays in the dialog", () => {
    render(
      <MinVersionDialog
        refusal={{ kind: "above-live", live: "1.4.3" }}
        enteredValue="1.4.4"
        onUseLive={mock(() => {})}
        onClose={mock(() => {})}
      />,
    );
    const dialog = screen.getByRole("alertdialog");
    const buttons = screen.getAllByRole("button");
    const last = buttons[buttons.length - 1];
    last.focus();

    fireEvent.keyDown(dialog, { key: "Tab" });

    expect(document.activeElement).toBe(buttons[0]);
  });

  it("explains an invalid version without promising a button that is not there", () => {
    render(
      <MinVersionDialog
        refusal={{ kind: "invalid" }}
        enteredValue="1.4"
        onUseLive={mock(() => {})}
        onClose={mock(() => {})}
      />,
    );

    expect(screen.getByText("Type three numbers with dots, like 1.4.0.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Use / })).toBeNull();
  });
});
