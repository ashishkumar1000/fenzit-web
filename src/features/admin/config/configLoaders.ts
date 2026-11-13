import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { ApiError } from "../../../services/api";
import { clearSession } from "../../../services/session";
import { messageForError } from "../../../utils/errorMessages";
import { consoleRole, loadMe } from "../adminLoader";
import {
  fetchAppRoadblockConfig,
  saveAppRoadblockConfig,
  type AppRoadblockConfig,
} from "./configApi";
import {
  draftFromForm,
  fieldErrorsFrom,
  toConfigBody,
  validateDraft,
  type FieldErrors,
} from "./configRules";

/**
 * Loader and action for the super-admin Config page. Only platform admins
 * (staff) get the form; anyone else gets the forbidden page, not a redirect.
 * The BE re-checks every write.
 *
 * A 403 is shown as "only super admins", not as a sign-out, so only a 401
 * clears the sign-in here.
 */

export type ConfigLoadData =
  { state: "ok"; config: AppRoadblockConfig } | { state: "forbidden" } | { state: "failed" };

export async function adminConfigLoader({ request }: LoaderFunctionArgs): Promise<ConfigLoadData> {
  try {
    const { token, me } = await loadMe(request);
    if (consoleRole(me) !== "staff") return { state: "forbidden" };
    return { state: "ok", config: await fetchAppRoadblockConfig(token, request.signal) };
  } catch (error) {
    if (error instanceof Response) throw error;
    if (error instanceof ApiError && error.status === 401) {
      clearSession();
      throw redirect("/login");
    }
    if (request.signal.aborted) throw error;
    if (error instanceof ApiError && error.status === 403) return { state: "forbidden" };
    return { state: "failed" };
  }
}

export type ConfigActionData =
  | { state: "saved" }
  | { state: "invalid"; message: string; fieldErrors: FieldErrors }
  | { state: "forbidden" }
  | { state: "error"; message: string };

export async function adminConfigAction({
  request,
}: ActionFunctionArgs): Promise<ConfigActionData> {
  try {
    const { token, me } = await loadMe(request);
    if (consoleRole(me) !== "staff") return { state: "forbidden" };
    const draft = draftFromForm(await request.formData());

    // The same rules as the screen, run again so a bypassed form still cannot send bad data.
    // The live Play version is not re-read here; the BE refuses it on save (422).
    const clientErrors = validateDraft(draft);
    if (Object.keys(clientErrors).length > 0) {
      return {
        state: "invalid",
        message: "Check the highlighted fields and try again.",
        fieldErrors: clientErrors,
      };
    }

    await saveAppRoadblockConfig(token, toConfigBody(draft), request.signal);
    return { state: "saved" };
  } catch (error) {
    if (error instanceof Response) throw error;
    if (error instanceof ApiError && error.status === 401) {
      clearSession();
      throw redirect("/login");
    }
    if (request.signal.aborted) throw error;
    if (error instanceof ApiError && error.status === 403) return { state: "forbidden" };
    if (error instanceof ApiError && error.status === 422) {
      return {
        state: "invalid",
        message: "Check the highlighted fields and try again.",
        fieldErrors: fieldErrorsFrom(error.body),
      };
    }
    return { state: "error", message: messageForError(error) };
  }
}
