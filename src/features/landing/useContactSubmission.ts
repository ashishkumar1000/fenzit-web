import { useState } from "react";
import { useFetcher } from "react-router";
import type { ContactRequestResult } from "./contactRequestAction";

/**
 * The state both contact forms need: whether a request is sending, what it
 * said back, and which field to mark. An error clears as soon as the visitor
 * edits the form, so it never points at text they have already changed.
 */
export function useContactSubmission() {
  const fetcher = useFetcher<ContactRequestResult>();
  const [editedSinceSubmit, setEditedSinceSubmit] = useState(false);
  const result = fetcher.data;
  const idle = fetcher.state === "idle";
  const error =
    idle && result !== undefined && !result.ok && !editedSinceSubmit ? result : undefined;

  return {
    fetcher,
    submitting: !idle,
    successMessage: result?.ok ? result.message : undefined,
    errorText: error?.error,
    errorField: error?.field,
    onEdit: () => setEditedSinceSubmit(true),
    onSubmit: () => setEditedSinceSubmit(false),
  };
}
