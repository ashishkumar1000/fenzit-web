import { useLoaderData } from "react-router";
import type { adminEmployeesLoader } from "../features/admin/adminBrowseLoaders";
import { humanize } from "../features/admin/status";
import { SectionCard } from "../features/admin/components/SectionCard";
import { DataTable, type TableCell } from "../features/admin/components/Table";
import { fmtDay, fmtPhone } from "../features/admin/format";
import styles from "./AdminEmployeesPage.module.css";

const ROLE_LABEL: Record<string, string> = {
  company_admin: "Owner",
  employee: "Employee",
  viewer: "Viewer",
};

/** The full team, alphabetically by join order — every employee of the
 *  company with their code and status. */
export function AdminEmployeesPage() {
  const data = useLoaderData<typeof adminEmployeesLoader>();

  if (data.state === "failed") {
    return (
      <SectionCard title="Employees">
        <p className={styles.failed} role="alert">
          The team list could not load. Use the sidebar to retry this page.
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Employees" meta={String(data.rows.length)}>
      <DataTable
        columns={["Name", "Phone", "Code", "Role", "Status", "Joined"]}
        empty="Nobody on the team yet."
        rows={data.rows.map((m): TableCell[] => [
          { text: m.name ?? "(no name)" },
          { text: fmtPhone(m.countryCode, m.phoneNumber), quiet: true },
          { text: m.employeeCode },
          { text: ROLE_LABEL[m.role] ?? humanize(m.role) },
          { text: m.status, status: true },
          { text: fmtDay(m.createdAt), quiet: true },
        ])}
      />
    </SectionCard>
  );
}
