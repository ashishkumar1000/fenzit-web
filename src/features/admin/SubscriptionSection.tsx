import { useState } from "react";
import { useRevalidator } from "react-router";
import { pushToast, toastForFailure } from "../../components/ui/toastStore";
import { apiFetch } from "../../services/api";
import { readSession } from "../../services/session";
import { messageForError } from "../../utils/errorMessages";
import { SectionCard } from "./components/SectionCard";
import { fmtIstDay, istDateInput } from "./format";
import styles from "./SubscriptionSection.module.css";

/**
 * Staff-only: the company's subscription end date, and the control to change
 * it (PUT /admin/tenants/:id/validity, super admins only). The date is a day
 * in India time; the subscription runs to the end of that day.
 */
export function SubscriptionSection({
  companyId,
  validityUntil,
}: {
  companyId: string;
  validityUntil: string | null;
}) {
  const revalidator = useRevalidator();
  const current = istDateInput(validityUntil);
  const [date, setDate] = useState(current);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unchanged = date === "" || date === current;

  const save = async () => {
    if (unchanged) return;
    const token = readSession()?.token;
    if (!token) {
      setError("Your session has ended. Please sign in again to save the changes.");
      return;
    }
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await apiFetch<unknown>(`/api/v1/admin/tenants/${companyId}/validity`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ validUntil: `${date}T23:59:59+05:30` }),
      });
      setSaved(true);
      // The card's "Saved" line scrolls away with the page; the toast keeps
      // the completion visible wherever the person is now (§4).
      pushToast("Subscription end date saved.", "success");
      revalidator.revalidate();
    } catch (failure) {
      setError(messageForError(failure));
      // The inline line stays; the toast adds the one reading the inline
      // line cannot give — a 401 with the re-login hint (§4.8).
      toastForFailure(failure);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard
      title="Subscription"
      meta={validityUntil ? `Valid until ${fmtIstDay(validityUntil)}` : "No Expiry Date"}
    >
      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <label className={styles.label}>
          <span>Subscription End Date (India Time)</span>
          <input
            className={styles.input}
            type="date"
            value={date}
            onChange={(event) => {
              setDate(event.target.value);
              setSaved(false);
            }}
          />
        </label>
        <button className={styles.button} type="submit" disabled={saving || unchanged}>
          {saving ? "Saving…" : "Save Date"}
        </button>
      </form>
      <p className={styles.note}>
        {unchanged
          ? "Change the date to save the new expiry date."
          : "The subscription will remain active until the end of the selected date."}
      </p>
      {saved ? (
        <p className={styles.saved} role="status">
          Saved Successfully.
        </p>
      ) : null}
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </SectionCard>
  );
}
