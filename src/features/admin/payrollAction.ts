import { redirect, type ActionFunctionArgs } from "react-router";
import { ApiError } from "../../services/api";
import { clearSession } from "../../services/session";
import { messageForError } from "../../utils/errorMessages";
import { isAuthError, requireConsoleRole } from "./adminLoader";
import { normalizeMoney } from "./payrollFormat";
import {
  createComponent,
  deactivateHead,
  saveCalendar,
  saveHead,
  savePfConfig,
  savePfExclusion,
  saveStateRules,
  saveStructure,
  updateComponent,
  type StructureLineInput,
} from "./payrollApi";
import type { FormulaNode } from "./payrollViews";

/**
 * The payroll page's action: one POST endpoint keyed by `intent`, mirroring
 * the employees page's action. Each intent parses the form into the exact
 * wire body, calls one API wrapper, and reports a `kind`-tagged result the
 * panel that submitted it renders inline (saved mark / plain-English error).
 */

export type PayrollActionResult =
  | { kind: "component-create"; state: "done" }
  | { kind: "component-create"; state: "error"; message: string }
  | { kind: "component-update"; state: "done"; componentId: string }
  | { kind: "component-update"; state: "error"; componentId: string; message: string }
  | { kind: "structure-save"; state: "done" }
  | { kind: "structure-save"; state: "error"; message: string }
  | { kind: "head-save"; state: "done" }
  | { kind: "head-save"; state: "error"; message: string }
  | { kind: "head-deactivate"; state: "done" }
  | { kind: "head-deactivate"; state: "error"; message: string }
  | { kind: "pf-config-save"; state: "done" }
  | { kind: "pf-config-save"; state: "error"; message: string }
  | { kind: "pf-exclusion-save"; state: "done" }
  | { kind: "pf-exclusion-save"; state: "error"; message: string }
  | { kind: "calendar-save"; state: "done" }
  | { kind: "calendar-save"; state: "error"; message: string }
  | { kind: "state-rules-save"; state: "done" }
  | { kind: "state-rules-save"; state: "error"; message: string };

const BAD_SEND = "That save could not be sent. Try again.";

/**
 * The payroll surfaces' error copy: the BE writes these refusals as product
 * copy (the February reason, the CoW window, the cycle chain, the
 * referencing-employees list) and journey-pins them, so a 4xx body's message
 * is shown verbatim. `ApiError.message` is only ever the generic status line
 * — the sentence lives in `error.body.message`. 403 stays with the shared
 * mapping (the guard's message is developer copy); everything else falls
 * back to `messageForError` as everywhere else in the console.
 */
export function beActionError(error: unknown): string {
  if (!(error instanceof ApiError)) return messageForError(error);
  if (error.status >= 400 && error.status < 500 && error.status !== 403) {
    const body = error.body as { message?: unknown } | undefined;
    if (body !== undefined && typeof body.message === "string" && body.message !== "") {
      return body.message;
    }
  }
  return messageForError(error);
}

/** The shared catch shape (the employees action's withActionError, pointing
 *  at the payroll copy): session loss redirects, aborts stay quiet, anything
 *  else becomes the caller's error result. */
function withPayrollError<R>(
  error: unknown,
  signal: AbortSignal,
  build: (message: string) => R,
): R {
  if (error instanceof Response) throw error;
  if (isAuthError(error)) {
    clearSession();
    throw redirect("/login");
  }
  if (signal.aborted) throw error;
  if (error instanceof DOMException && error.name === "AbortError") throw error;
  return build(beActionError(error));
}

const text = (form: FormData, key: string): string => {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
};

const flag = (form: FormData, key: string): boolean | null => {
  const value = form.get(key);
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
};

const DATE_SHAPE = /^\d{4}-\d{2}-\d{2}$/;

export async function adminPayrollAction({
  request,
}: ActionFunctionArgs): Promise<PayrollActionResult> {
  const form = await request.formData();
  const intent = text(form, "intent");
  try {
    const { token } = await requireConsoleRole(request, ["owner"]);
    switch (intent) {
      case "component-create": {
        const name = text(form, "name");
        if (name === "") return errorResult("component-create", "Name the component to save it.");
        const isBasic = flag(form, "isBasic");
        await createComponent(
          token,
          { name, ...(isBasic === true ? { isBasic: true } : {}) },
          request.signal,
        );
        return { kind: "component-create", state: "done" };
      }
      case "component-update": {
        const componentId = text(form, "componentId");
        if (componentId === "") return errorResult("component-update", BAD_SEND, componentId);
        const body: { name?: string; isBasic?: boolean; active?: boolean } = {};
        const name = text(form, "name");
        if (form.has("name") && name !== "") body.name = name;
        const isBasic = flag(form, "isBasic");
        if (isBasic !== null) body.isBasic = isBasic;
        const active = flag(form, "active");
        if (active !== null) body.active = active;
        if (Object.keys(body).length === 0)
          return errorResult("component-update", BAD_SEND, componentId);
        await updateComponent(token, componentId, body, request.signal);
        return { kind: "component-update", state: "done", componentId };
      }
      case "structure-save": {
        const userId = text(form, "userId");
        const effectiveFrom = text(form, "effectiveFrom");
        if (userId === "" || !DATE_SHAPE.test(effectiveFrom))
          return errorResult("structure-save", "Pick a real date and an employee to save.");
        const lines = parseLinesJson(text(form, "lines"));
        if (lines === null)
          return errorResult("structure-save", "That structure could not be sent. Try again.");
        await saveStructure(token, userId, { effectiveFrom, lines }, request.signal);
        return { kind: "structure-save", state: "done" };
      }
      case "head-save": {
        const name = text(form, "name");
        const kind = text(form, "kind") === "percent" ? "percent" : "flat";
        const amount = normalizeMoney(text(form, "amount"));
        const basis = text(form, "basis");
        const effectiveFrom = text(form, "effectiveFrom");
        if (name === "" || amount === null || !DATE_SHAPE.test(effectiveFrom))
          return errorResult(
            "head-save",
            "Enter a name, an amount and a real date to save the deduction.",
          );
        if (kind === "percent" && basis !== "basic" && basis !== "gross")
          return errorResult(
            "head-save",
            "A percentage deduction comes off Basic salary or Gross pay.",
          );
        await saveHead(
          token,
          {
            name,
            kind,
            amount,
            effectiveFrom,
            ...(kind === "percent" ? { basis: basis as "basic" | "gross" } : {}),
          },
          request.signal,
        );
        return { kind: "head-save", state: "done" };
      }
      case "head-deactivate": {
        const headId = text(form, "headId");
        if (headId === "") return errorResult("head-deactivate", BAD_SEND);
        await deactivateHead(token, headId, request.signal);
        return { kind: "head-deactivate", state: "done" };
      }
      case "pf-config-save": {
        const effectiveFrom = text(form, "effectiveFrom");
        const covered = flag(form, "covered");
        if (!DATE_SHAPE.test(effectiveFrom) || covered === null)
          return errorResult("pf-config-save", "Pick a real date to save the PF switch.");
        await savePfConfig(token, { effectiveFrom, covered }, request.signal);
        return { kind: "pf-config-save", state: "done" };
      }
      case "pf-exclusion-save": {
        const userId = text(form, "userId");
        const excluded = flag(form, "excluded");
        if (userId === "" || excluded === null) return errorResult("pf-exclusion-save", BAD_SEND);
        await savePfExclusion(token, userId, excluded, request.signal);
        return { kind: "pf-exclusion-save", state: "done" };
      }
      case "calendar-save": {
        const effectiveFrom = text(form, "effectiveFrom");
        if (!DATE_SHAPE.test(effectiveFrom))
          return errorResult("calendar-save", "Pick a real date to save the calendar row.");
        const body: {
          effectiveFrom: string;
          divisorConvention?: "calendar" | "fixed-30" | "fixed-26";
          cutoffDay?: number;
          payDate?: number;
        } = { effectiveFrom };
        const divisor = text(form, "divisorConvention");
        if (divisor === "calendar" || divisor === "fixed-30" || divisor === "fixed-26") {
          body.divisorConvention = divisor;
        }
        const cutoff = text(form, "cutoffDay");
        if (cutoff !== "" && /^\d{1,2}$/.test(cutoff)) body.cutoffDay = Number(cutoff);
        const payDate = text(form, "payDate");
        if (payDate !== "" && /^\d{1,2}$/.test(payDate)) body.payDate = Number(payDate);
        await saveCalendar(token, body, request.signal);
        return { kind: "calendar-save", state: "done" };
      }
      case "state-rules-save": {
        const notified = flag(form, "notified");
        if (notified === null) return errorResult("state-rules-save", BAD_SEND);
        await saveStateRules(token, notified, request.signal);
        return { kind: "state-rules-save", state: "done" };
      }
      default:
        return errorResult("structure-save", BAD_SEND);
    }
  } catch (error) {
    // The component dialog matches its own error by the row's id, so the id
    // rides even through a thrown fetch — the other dialogs each own their
    // kind outright.
    const componentId = text(form, "componentId");
    return withPayrollError(error, request.signal, (message) =>
      errorResult(intent, message, componentId),
    );
  }
}

function errorResult(intent: string, message: string, componentId?: string): PayrollActionResult {
  if (intent === "component-update") {
    return {
      kind: "component-update",
      state: "error",
      componentId: componentId ?? "",
      message,
    };
  }
  switch (intent) {
    case "component-create":
      return { kind: "component-create", state: "error", message };
    case "structure-save":
      return { kind: "structure-save", state: "error", message };
    case "head-save":
      return { kind: "head-save", state: "error", message };
    case "head-deactivate":
      return { kind: "head-deactivate", state: "error", message };
    case "pf-config-save":
      return { kind: "pf-config-save", state: "error", message };
    case "pf-exclusion-save":
      return { kind: "pf-exclusion-save", state: "error", message };
    case "calendar-save":
      return { kind: "calendar-save", state: "error", message };
    default:
      return { kind: "state-rules-save", state: "error", message };
  }
}

/** The editor hands the exact lines array over as JSON; this restores it and
 *  checks the wire shape only (one line per component, amount XOR formula,
 *  formula nodes built by the editor). Domain refusals stay with the BE. */
function parseLinesJson(raw: string): StructureLineInput[] | null {
  if (raw === "") return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length === 0 || parsed.length > 100) return null;
  const seen = new Set<string>();
  const lines: StructureLineInput[] = [];
  for (const entry of parsed) {
    if (typeof entry !== "object" || entry === null) return null;
    const line = entry as { componentId?: unknown; amount?: unknown; formula?: unknown };
    if (typeof line.componentId !== "string" || line.componentId === "") return null;
    if (seen.has(line.componentId)) return null;
    seen.add(line.componentId);
    if (typeof line.amount === "string" && line.formula === undefined) {
      const amount = normalizeMoney(line.amount);
      if (amount === null) return null;
      lines.push({ componentId: line.componentId, amount });
      continue;
    }
    if (line.amount === undefined && isFormulaNode(line.formula)) {
      lines.push({ componentId: line.componentId, formula: line.formula });
      continue;
    }
    return null;
  }
  return lines;
}

function isFormulaNode(value: unknown): value is FormulaNode {
  if (typeof value !== "object" || value === null) return false;
  const node = value as {
    kind?: unknown;
    percent?: unknown;
    value?: unknown;
    of?: unknown;
    op?: unknown;
    left?: unknown;
    right?: unknown;
    componentId?: unknown;
  };
  switch (node.kind) {
    case "component":
      return typeof node.componentId === "string" && node.componentId !== "";
    case "const":
      return typeof node.value === "number" && Number.isFinite(node.value);
    case "percent-of":
      return (
        typeof node.percent === "number" && Number.isFinite(node.percent) && isFormulaNode(node.of)
      );
    case "binary":
      return (
        (node.op === "+" || node.op === "-" || node.op === "*" || node.op === "/") &&
        isFormulaNode(node.left) &&
        isFormulaNode(node.right)
      );
    default:
      return false;
  }
}
