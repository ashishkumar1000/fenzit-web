import { useState } from "react";
import { useRevalidator } from "react-router";
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
      setError("Your session has ended. Sign in again to save.");
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
      revalidator.revalidate();
    } catch (failure) {
      setError(messageForError(failure));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard
      title="Subscription"
      meta={validityUntil ? `Valid until ${fmtIstDay(validityUntil)}` : "No end date"}
    >
      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <label className={styles.label}>
          <span>Valid until (India time)</span>
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
          {saving ? "Saving…" : "Save date"}
        </button>
      </form>
      <p className={styles.note}>
        {unchanged
          ? "Change the date to save it."
          : "The subscription ends at the end of this day."}
      </p>
      {saved ? (
        <p className={styles.saved} role="status">
          Saved.
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
