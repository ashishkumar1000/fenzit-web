import { useLoaderData } from "react-router";
import type { adminHolidaysLoader } from "../features/admin/adminBrowseLoaders";
import { Badge } from "../features/admin/components/Badge";
import { SectionCard } from "../features/admin/components/SectionCard";
import { fmtDay } from "../features/admin/format";
import styles from "./AdminHolidaysPage.module.css";

/** The company's holidays: upcoming ones as chips on top, the past below. */
export function AdminHolidaysPage() {
  const data = useLoaderData<typeof adminHolidaysLoader>();

  if (data.state === "failed") {
    return (
      <SectionCard title="Holidays">
        <p className={styles.failed} role="alert">
          The holiday list could not load. Use the sidebar to retry this page.
        </p>
      </SectionCard>
    );
  }

  const today = new Date().toLocaleDateString("en-CA");
  const upcoming = data.rows.filter((h) => h.date >= today);
  const past = data.rows.filter((h) => h.date < today).reverse();

  return (
    <SectionCard title="Holidays" meta={String(data.rows.length)}>
      {data.rows.length === 0 ? (
        <p className={styles.empty}>No holidays have been set up yet.</p>
      ) : (
        <>
          <p className={styles.caption}>Upcoming</p>
          {upcoming.length === 0 ? (
            <p className={styles.empty}>No upcoming holidays.</p>
          ) : (
            <div className={styles.chips}>
              {upcoming.map((h) => (
                <Badge key={h.id} label={`${fmtDay(h.date)} · ${h.name}`} tone="neutral" />
              ))}
            </div>
          )}
          {past.length > 0 ? (
            <>
              <p className={styles.captionPast}>Past</p>
              <div className={styles.chips}>
                {past.map((h) => (
                  <Badge key={h.id} label={`${fmtDay(h.date)} · ${h.name}`} tone="neutral" />
                ))}
              </div>
            </>
          ) : null}
        </>
      )}
    </SectionCard>
  );
}
