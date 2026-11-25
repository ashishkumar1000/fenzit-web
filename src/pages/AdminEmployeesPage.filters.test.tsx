import { describe, expect, it } from "bun:test";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { jsonResponse, sentRequests, setRespond } from "../testing/fetchMock";
import {
  lastPageRequest,
  pageOf,
  renderAt,
  row,
  standard,
  team,
  setUpEmployeesPageTests,
} from "../testing/employeesPageKit";

// The Employees page's query, pager and search box — the edges the owner can
// reach: out-of-range pages, empty and whitespace input, the exact query sent
// to the backend, and the Clear all and back/forward behaviour.

setUpEmployeesPageTests();

function manyPeople() {
  team.rows = Array.from({ length: 60 }, (_, i) =>
    row(`u-${i}`, `Person ${String(i).padStart(2, "0")}`, "employee", "active"),
  );
}

describe("Employees: the query sent to the backend", () => {
  it("sends the filters, sort, page and page size from the address, exactly", async () => {
    renderAt(
      "/admin/company/employees?q=asha&status=active&role=employee&jobSetting=approval&sort=name_az&page=2&pageSize=25",
    );
    await waitFor(() => expect(lastPageRequest().searchParams.get("search")).toBe("asha"));
    const sent = lastPageRequest().searchParams;
    expect(sent.get("search")).toBe("asha");
    expect(sent.get("status")).toBe("active");
    expect(sent.get("role")).toBe("employee");
    expect(sent.get("jobSetting")).toBe("approval");
    expect(sent.get("sort")).toBe("name_az");
    expect(sent.get("page")).toBe("2");
    expect(sent.get("pageSize")).toBe("25");
  });

  it("sends the trimmed search, not the raw text the owner typed", async () => {
    renderAt("/admin/company/employees");
    const input = await screen.findByRole("searchbox", { name: "Search employees" });
    fireEvent.change(input, { target: { value: "   Asha   " } });
    fireEvent.submit(input.closest("form") as HTMLFormElement);
    await waitFor(() => expect(lastPageRequest().searchParams.get("search")).toBe("Asha"));
  });
});

describe("Employees: pages and the pager", () => {
  it("keeps the pager on a page past the last one, so the owner can get back", async () => {
    setRespond((url) => {
      const parsed = new URL(url, "http://localhost");
      if (parsed.pathname.endsWith("/members/page")) {
        return jsonResponse({
          ...pageOf(parsed.searchParams, team.rows),
          data: [],
          page: 9,
          pages: 2,
        });
      }
      return standard(url);
    });
    renderAt("/admin/company/employees?page=9");
    expect(
      await screen.findByText("No employees found. Try changing your filters or search."),
    ).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Pages" });
    const back = within(nav).getByRole("link", { name: "1" });
    expect(back.getAttribute("href")).toBe("/admin/company/employees");
  });

  it("shows the empty-team line, and no pager, when nobody is on the team", async () => {
    team.rows = [];
    renderAt("/admin/company/employees");
    expect(await screen.findByText("No employees added yet.")).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Pages" })).toBeNull();
  });

  it("shows a five-page window centred on the current page, with Next and Last", async () => {
    manyPeople();
    renderAt("/admin/company/employees?page=3");
    await screen.findByText("Person 20");
    const nav = screen.getByRole("navigation", { name: "Pages" });
    const numbers = within(nav)
      .getAllByRole("link")
      .map((link) => link.textContent)
      .filter((text) => /^\d+$/.test(text ?? ""));
    expect(numbers).toEqual(["1", "2", "3", "4", "5"]);
    expect(within(nav).getByRole("link", { name: "Last Page" }).getAttribute("href")).toContain(
      "page=6",
    );
  });

  it("holds the window at the last page when the owner is on the final page", async () => {
    manyPeople();
    renderAt("/admin/company/employees?page=6");
    await screen.findByText("Person 50");
    const nav = screen.getByRole("navigation", { name: "Pages" });
    const numbers = within(nav)
      .getAllByRole("link")
      .map((link) => link.textContent)
      .filter((text) => /^\d+$/.test(text ?? ""));
    expect(numbers).toEqual(["2", "3", "4", "5", "6"]);
    expect(within(nav).queryByRole("link", { name: "Next Page" })).toBeNull();
  });

  it("explains an out-of-range go-to, keeps the typed number, and sends nothing", async () => {
    manyPeople();
    renderAt("/admin/company/employees");
    await screen.findByText("Person 00");
    const box = screen.getByRole("textbox", { name: "Go to Page" }) as HTMLInputElement;
    const before = sentRequests().length;
    fireEvent.change(box, { target: { value: "9" } });
    fireEvent.submit(box.closest("form") as HTMLFormElement);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Please enter a page number between 1 and 6.",
    );
    expect(box.value).toBe("9");
    expect(box.getAttribute("aria-invalid")).toBe("true");
    expect(sentRequests().length).toBe(before);
  });

  it.each([
    ["0", "Please enter a page number between 1 and 6."],
    ["", "Please enter a page number between 1 and 6."],
  ])("rejects go-to %j with a message", async (value, message) => {
    manyPeople();
    renderAt("/admin/company/employees");
    await screen.findByText("Person 00");
    const box = screen.getByRole("textbox", { name: "Go to Page" });
    fireEvent.change(box, { target: { value: value } });
    fireEvent.submit(box.closest("form") as HTMLFormElement);
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
  });

  it("goes to a valid page typed into go-to, and clears the message", async () => {
    manyPeople();
    renderAt("/admin/company/employees");
    await screen.findByText("Person 00");
    const box = screen.getByRole("textbox", { name: "Go to Page" });
    fireEvent.change(box, { target: { value: "4" } });
    fireEvent.submit(box.closest("form") as HTMLFormElement);
    await waitFor(() => expect(lastPageRequest().searchParams.get("page")).toBe("4"));
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("Employees: the deactivated status", () => {
  it("filters to the deactivated rows and sends the status to the backend", async () => {
    renderAt("/admin/company/employees?status=deactivated");
    expect(await screen.findByText("Dinesh P")).toBeInTheDocument();
    expect(screen.queryByText("Asha V")).toBeNull();
    expect(lastPageRequest().searchParams.get("status")).toBe("deactivated");
  });

  it("shows the Deactivated chip with its whole-team count", async () => {
    renderAt("/admin/company/employees");
    await screen.findByText("Asha V");
    const chips = screen.getByRole("group", { name: "Filter by status" });
    const deactivated = within(chips).getByRole("link", { name: /Deactivated/ });
    expect(deactivated).toHaveTextContent("1");
  });
});

describe("Employees: the search box and Clear all", () => {
  it("empties the search box when Clear all is pressed", async () => {
    renderAt("/admin/company/employees?q=asha");
    const input = (await screen.findByRole("searchbox", {
      name: "Search employees",
    })) as HTMLInputElement;
    expect(input.value).toBe("asha");
    fireEvent.click(screen.getByRole("button", { name: "Clear All Filters" }));
    await waitFor(() => expect(input.value).toBe(""));
    expect(lastPageRequest().searchParams.get("search") ?? "").toBe("");
  });

  it("follows the address when it changes outside the box (back or forward)", async () => {
    const router = renderAt("/admin/company/employees?q=asha");
    const input = (await screen.findByRole("searchbox", {
      name: "Search employees",
    })) as HTMLInputElement;
    await router.navigate("/admin/company/employees?q=chitra");
    await waitFor(() => expect(input.value).toBe("chitra"));
  });
});
