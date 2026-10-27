// The "Load more" button appends fetched pages to the ones already on
// screen; the router loader still owns the first page. This effect only
// appends the extra page the visitor explicitly asked for.
// eslint-disable-next-line no-restricted-imports
import { useEffect, useRef, useState } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { Button } from "../components/ui/Button";
import type { adminCustomersLoader } from "../features/admin/adminBrowseLoaders";
import { SectionCard } from "../features/admin/components/SectionCard";
import { DataTable, type TableCell } from "../features/admin/components/Table";
import { fmtDay, fmtPhone } from "../features/admin/format";
import styles from "./AdminCustomersPage.module.css";

/** The customers drill-down: the full list, one appended page at a time.
 *  "Load more" keeps the loaded rows and the scroll position; when the
 *  cursor runs out the footer says so. */
export function AdminCustomersPage() {
  const data = useLoaderData<typeof adminCustomersLoader>();
  const fetcher = useFetcher<{
    state: "ok";
    rows: Array<{ id: string }>;
    nextCursor: string | null;
    requested: string | null;
  }>();
  const [rows, setRows] = useState(data.state === "ok" ? data.rows : []);
  const [cursor, setCursor] = useState(data.state === "ok" ? data.nextCursor : null);
  const applied = useRef<string | null>(null);

  useEffect(() => {
    const d = fetcher.data;
    if (!d || d.requested === applied.current) return;
    applied.current = d.requested;
    setRows((prev) => [...prev, ...(d.rows as Array<(typeof prev)[number]>)]);
    setCursor(d.nextCursor);
  }, [fetcher.data]);

  if (data.state === "failed") {
    return (
      <SectionCard title="Customers">
        <p className={styles.failed} role="alert">
          The customer list could not load. Use the sidebar to retry this page.
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Customers"
      meta={`${rows.length} loaded`}
      footer={
        cursor !== null ? (
          <fetcher.Form method="get" className={styles.more}>
            <input type="hidden" name="cursor" value={cursor} />
            <Button type="submit" disabled={fetcher.state !== "idle"}>
              {fetcher.state !== "idle" ? "Loading…" : "Load more"}
            </Button>
          </fetcher.Form>
        ) : (
          "That's everyone."
        )
      }
    >
      <DataTable
        columns={["Name", "Phone", "Address", "Jobs", "Last job"]}
        empty="No customers yet."
        rows={rows.map((c): TableCell[] => [
          { text: c.name },
          { text: fmtPhone(c.countryCode, c.phoneNumber), quiet: true },
          { text: c.address ?? "—" },
          { text: String(c.jobCount) },
          { text: c.lastJobDate === null ? "—" : fmtDay(c.lastJobDate), quiet: true },
        ])}
      />
    </SectionCard>
  );
}
