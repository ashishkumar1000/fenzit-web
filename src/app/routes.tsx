import { redirect, type LoaderFunctionArgs, type RouteObject } from "react-router";
import { countryCodesLoader } from "../services/countryCodes";
import { adminAccountAction } from "../features/admin/adminAccountAction";
import { adminJobsAction } from "../features/admin/adminBrowseLoaders";
import { callBackAction, demoAction } from "../features/landing/contactRequestAction";
import { deleteAccountAction } from "../features/account-deletion/deletionAction";
import { UseCasePage } from "../features/use-case/components/UseCasePage";
import { ALL_USE_CASE_CONTENT } from "../features/use-case/content/registry";
import { AttendancePage } from "../pages/AttendancePage";
import { DeleteAccountPage } from "../pages/DeleteAccountPage";
import { DownloadAppPage } from "../pages/DownloadAppPage";
import { FeaturesPage } from "../pages/FeaturesPage";
import { HomePage } from "../pages/HomePage";
import { BookDemoPage, DataSafetyPage, PartnersPage } from "../pages/InfoPages";
import { PricingPage } from "../pages/PricingPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { PrivacyPolicyPage, SecurityTrustPage, TermsOfServicePage } from "../pages/LegalPage";
import { RootLayout } from "./RootLayout";
import { AdminBootFallback } from "./AdminBootFallback";

/**
 * Every route in the app. Kept free of browser-only code, so the build can render it on the
 * server for the static pages, and tests can build a memory router from the same table.
 *
 * The use-case pages share one template; the registry pairs each path with its content.
 */
export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    // The console's boot fallback lives at the root, eagerly: a fallback
    // declared inside the /admin route's own lazy module is unreachable on
    // boot (it cannot load before the module it waits for), which left the
    // real blank window uncovered. See AdminBootFallback for the measured
    // evidence.
    HydrateFallback: AdminBootFallback,
    children: [
      {
        id: "home",
        path: "/",
        element: <HomePage />,
        loader: countryCodesLoader,
        // The call-back form posts here.
        action: callBackAction,
        // The country list does not change after a submit. Reloading it would replace the
        // full list with the India fallback while the new request runs.
        shouldRevalidate: () => false,
      },
      { path: "/features", element: <FeaturesPage /> },
      { path: "/attendance", element: <AttendancePage /> },
      { path: "/pricing", element: <PricingPage /> },
      {
        path: "/book-demo",
        element: <BookDemoPage />,
        loader: countryCodesLoader,
        action: demoAction,
        shouldRevalidate: () => false,
      },
      { path: "/data-safety", element: <DataSafetyPage /> },
      { path: "/partners", element: <PartnersPage /> },
      { path: "/privacy-policy", element: <PrivacyPolicyPage /> },
      {
        // Public: asks for an account to be deleted. Phone code first; nothing is deleted here.
        path: "/delete-account",
        element: <DeleteAccountPage />,
        action: deleteAccountAction,
      },
      { path: "/app/download", element: <DownloadAppPage /> },
      { path: "/terms", element: <TermsOfServicePage /> },
      { path: "/security-trust", element: <SecurityTrustPage /> },
      ...ALL_USE_CASE_CONTENT.map((content) => ({
        path: content.meta.path,
        element: <UseCasePage content={content} />,
      })),
      // Client-only pages, loaded on first visit. They depend on the saved sign-in, so they are
      // not pre-rendered. Their code is split out of the landing page's bundle.
      {
        path: "/login",
        lazy: async () => {
          const [{ LoginPage }, { loginAction }] = await Promise.all([
            import("../pages/LoginPage"),
            import("../features/login/loginAction"),
          ]);
          return { Component: LoginPage, action: loginAction };
        },
      },
      {
        // The console: one layout with per-role child sections (staff inspect/
        // account, owner company, employee me). A lazy() return cannot carry
        // children, so the child list is static and each child lazy-loads its
        // own chunk.
        path: "/admin",
        id: "admin",
        lazy: async () => {
          const [{ AdminLayout, AdminChecking }, { adminLoader }] = await Promise.all([
            import("../pages/AdminPage"),
            import("../features/admin/adminLoader"),
          ]);
          return {
            Component: AdminLayout,
            loader: adminLoader,
            HydrateFallback: AdminChecking,
            // The layout loader fetches /users/me and the Leave badge's
            // summary. The session doesn't change while it lasts, so a
            // navigation to any console section skips the refetch — but a
            // submission anywhere (the leave decisions' fetcher post) is a
            // revalidation the badge must ride, or the count would keep
            // naming requests that no longer exist. Returning to /admin
            // revalidates.
            shouldRevalidate: ({ formMethod, nextUrl }) =>
              formMethod !== undefined || nextUrl.pathname === "/admin",
          };
        },
        children: [
          {
            index: true,
            lazy: () => import("../pages/AdminPage").then((m) => ({ Component: m.AdminHome })),
          },
          {
            path: "inspect",
            lazy: async () => {
              const [page, loaderModule] = await Promise.all([
                import("../pages/AdminInspectPage"),
                import("../features/admin/adminInspectLoader"),
              ]);
              return {
                Component: page.AdminInspectPage,
                loader: loaderModule.adminInspectLoader,
              };
            },
          },
          {
            path: "account",
            action: adminAccountAction,
            lazy: async () => {
              const [page, loaderModule] = await Promise.all([
                import("../pages/AdminAccountPage"),
                import("../features/admin/adminAccountLoader"),
              ]);
              return {
                Component: page.AdminAccountPage,
                loader: loaderModule.adminAccountLoader,
              };
            },
          },
          {
            path: "reports",
            lazy: async () => {
              const [page, loaderModule] = await Promise.all([
                import("../pages/AdminReportsPage"),
                import("../features/admin/adminReportsLoaders"),
              ]);
              return {
                Component: page.AdminReportsPage,
                loader: loaderModule.adminReportsLoader,
                action: loaderModule.adminReportsAction,
              };
            },
          },
          {
            path: "deletion-requests",
            lazy: async () => {
              const [page, loaderModule] = await Promise.all([
                import("../pages/AdminDeletionRequestsPage"),
                import("../features/admin/adminDeletionLoaders"),
              ]);
              return {
                Component: page.AdminDeletionRequestsPage,
                loader: loaderModule.adminDeletionLoader,
                action: loaderModule.adminDeletionAction,
              };
            },
          },
          {
            // Super admins only: the loader and action both refuse other roles.
            path: "config",
            lazy: async () => {
              const [page, loaderModule] = await Promise.all([
                import("../pages/AdminConfigPage"),
                import("../features/admin/config/configLoaders"),
              ]);
              return {
                Component: page.AdminConfigPage,
                loader: loaderModule.adminConfigLoader,
                action: loaderModule.adminConfigAction,
              };
            },
          },
          {
            // The console's Help & Support page: static content, no loader —
            // the shell already carries identity and the sidebar.
            path: "help",
            lazy: () =>
              import("../pages/AdminHelpPage").then((m) => ({ Component: m.AdminHelpPage })),
          },
          {
            path: "company",
            lazy: async () => {
              const [page, loaderModule] = await Promise.all([
                import("../pages/AdminCompanyPage"),
                import("../features/admin/adminCompanyLoader"),
              ]);
              return {
                Component: page.AdminCompanyPage,
                loader: loaderModule.adminCompanyLoader,
              };
            },
          },
          {
            path: "me",
            lazy: async () => {
              const [page, loaderModule] = await Promise.all([
                import("../pages/AdminMePage"),
                import("../features/admin/adminMeLoader"),
              ]);
              return {
                Component: page.AdminMePage,
                loader: loaderModule.adminMeLoader,
              };
            },
          },
          {
            path: "me/new-job",
            lazy: async () => {
              const [page, loaderModule] = await Promise.all([
                import("../pages/AdminMeNewJobPage"),
                import("../features/admin/meCreateJobLoaders"),
              ]);
              return {
                Component: page.AdminMeNewJobPage,
                loader: loaderModule.meCreateJobLoader,
                action: loaderModule.meCreateJobAction,
              };
            },
          },
          {
            path: "company/customers",
            lazy: async () => {
              const [page, loaderModule] = await Promise.all([
                import("../pages/AdminCustomersPage"),
                import("../features/admin/adminBrowseLoaders"),
              ]);
              return {
                Component: page.AdminCustomersPage,
                loader: loaderModule.adminCustomersLoader,
                action: loaderModule.adminCustomersAction,
              };
            },
          },
          {
            path: "company/employees",
            lazy: async () => {
              const [page, loaderModule] = await Promise.all([
                import("../pages/AdminEmployeesPage"),
                import("../features/admin/adminBrowseLoaders"),
              ]);
              return {
                Component: page.AdminEmployeesPage,
                loader: loaderModule.adminEmployeesLoader,
                action: loaderModule.adminEmployeesAction,
              };
            },
          },
          {
            // One employee's profile — five tabs (Master Record, Jobs,
            // Attendance, Leave, Payroll); the tab and the attendance month
            // ride the address, and only that tab's data is fetched. The
            // route's own action (deactivate/reinstate) always refetches so
            // the status pill never lies.
            path: "company/employees/:userId",
            shouldRevalidate: ({ currentUrl, nextUrl, formMethod }) =>
              // Any submission to this route (the activate fetcher) refetches.
              formMethod !== undefined ||
              // A different employee's address always refetches — the member
              // rides the pathname, so an identical ?tab=/?month= must never
              // serve profile A's data under profile B's URL.
              currentUrl.pathname !== nextUrl.pathname ||
              // The same address's manual retry (revalidation) refetches; a
              // same-person navigation where tab or month moved refetches
              // for the new section.
              (currentUrl.pathname === nextUrl.pathname && currentUrl.search === nextUrl.search) ||
              currentUrl.searchParams.get("tab") !== nextUrl.searchParams.get("tab") ||
              currentUrl.searchParams.get("month") !== nextUrl.searchParams.get("month"),
            lazy: async () => {
              const [page, loaderModule] = await Promise.all([
                import("../pages/AdminEmployeeProfilePage"),
                import("../features/admin/employeeProfileLoaders"),
              ]);
              return {
                Component: page.AdminEmployeeProfilePage,
                loader: loaderModule.employeeProfileLoader,
                action: loaderModule.employeeProfileAction,
              };
            },
          },
          {
            // The employment dialog's resource route: loader for the open
            // read, action for the save, no page of its own. It carries one
            // member's PAN/DOB/bank, so the owner gate sits inside both.
            path: "company/employees/employment",
            lazy: async () => {
              const module = await import("../features/admin/payrollLoaders");
              return {
                loader: module.payrollEmploymentLoader,
                action: module.payrollEmploymentAction,
              };
            },
          },
          {
            // Payroll configuration — components, structures, deductions,
            // statutory switches, calendar. Owner only, tabs like the jobs
            // page.
            path: "company/payroll",
            lazy: async () => {
              const [page, loaderModule, actionModule] = await Promise.all([
                import("../pages/AdminPayrollPage"),
                import("../features/admin/payrollLoaders"),
                import("../features/admin/payrollAction"),
              ]);
              return {
                Component: page.AdminPayrollPage,
                loader: loaderModule.adminPayrollLoader,
                action: actionModule.adminPayrollAction,
              };
            },
          },
          {
            path: "company/jobs",
            action: adminJobsAction,
            lazy: async () => {
              const [page, loaderModule] = await Promise.all([
                import("../pages/AdminJobsPage"),
                import("../features/admin/adminBrowseLoaders"),
              ]);
              return {
                Component: page.AdminJobsPage,
                loader: loaderModule.adminJobsLoader,
              };
            },
          },
          {
            // The owner's create form: same component as the employee's
            // /admin/me/new-job, with a technician picker and any-employee
            // assignment (the backend enforces who may assign whom).
            path: "company/jobs/new",
            lazy: async () => {
              const [page, loaderModule] = await Promise.all([
                import("../pages/AdminMeNewJobPage"),
                import("../features/admin/meCreateJobLoaders"),
              ]);
              return {
                Component: page.AdminMeNewJobPage,
                loader: loaderModule.meCreateJobLoader,
                action: loaderModule.meCreateJobAction,
              };
            },
          },
          {
            // One job's detail — common: the owner opens any job in the
            // company, an employee only a job assigned to them (the backend
            // 404s the rest). Static paths like company/jobs/new rank above
            // this dynamic segment on their own.
            path: "company/jobs/:jobId",
            lazy: async () => {
              const [page, loaderModule] = await Promise.all([
                import("../pages/AdminJobDetailPage"),
                import("../features/admin/adminJobDetailLoader"),
              ]);
              return {
                Component: page.AdminJobDetailPage,
                loader: loaderModule.adminJobDetailLoader,
              };
            },
          },
          {
            // The approval queue's old address (pre-2026-11-14 tabs): old
            // bookmarks and shared links ride over to its new tab instead of
            // dying on the 404 page, keeping their filters and cursors.
            path: "company/approvals",
            loader: ({ request }: LoaderFunctionArgs) => {
              const query = new URL(request.url).searchParams;
              query.set("tab", "approval");
              throw redirect(`/admin/company/jobs?${query.toString()}`);
            },
          },
          {
            path: "company/holidays",
            lazy: async () => {
              const [page, loaderModule] = await Promise.all([
                import("../pages/AdminHolidaysPage"),
                import("../features/admin/holidayLoaders"),
              ]);
              return {
                Component: page.AdminHolidaysPage,
                loader: loaderModule.adminHolidaysLoader,
                action: loaderModule.adminHolidayAction,
              };
            },
          },
          {
            // The holiday calendar's full-list view (2026-11-26): a flat
            // sibling — the same overview loader, plus the inspector
            // sidebar's impact facts on ?inspect=<date>. Row writes post to
            // this route's own action (the same function).
            path: "company/holidays/schedule",
            lazy: async () => {
              const [page, loaderModule] = await Promise.all([
                import("../pages/HolidaysSchedulePage"),
                import("../features/admin/holidayLoaders"),
              ]);
              return {
                Component: page.HolidaysSchedulePage,
                loader: loaderModule.adminHolidayScheduleLoader,
                action: loaderModule.adminHolidayAction,
              };
            },
          },
          {
            // The holidays section's bulk-upload tab (2026-11-26): the
            // download/fill/upload flow. Its own loader adds the WHOLE
            // calendar's dates so the confirm popup can mark each sheet row
            // new or already-there; the upload itself posts the .xlsx
            // straight to BE from the page.
            path: "company/holidays/upload",
            lazy: async () => {
              const [page, loaderModule] = await Promise.all([
                import("../pages/AdminHolidayUploadPage"),
                import("../features/admin/holidayLoaders"),
              ]);
              return {
                Component: page.AdminHolidayUploadPage,
                loader: loaderModule.adminHolidayUploadLoader,
                action: loaderModule.adminHolidayAction,
              };
            },
          },
          {
            // The leave section: the fixed type catalog's values on the first
            // tab, the whole-company requests and their approvals on the
            // second. No shouldRevalidate — a tab/status/cursor change is a
            // genuine refetch, and the decision actions revalidate by default
            // (the list refreshes after an approve).
            path: "company/leave",
            lazy: async () => {
              const [page, loaderModule] = await Promise.all([
                import("../pages/AdminLeavePage"),
                import("../features/admin/leaveLoaders"),
              ]);
              return {
                Component: page.AdminLeavePage,
                loader: loaderModule.adminLeaveLoader,
                action: loaderModule.adminLeaveAction,
              };
            },
          },
          {
            path: "company/attendance",
            // The month table's chip/office/sort/pager live in the address but
            // are client-side (the roster arrives whole and the monthly
            // endpoint is expensive) — refetch only when the tab changes or
            // the address itself did not move (a manual retry revalidation).
            shouldRevalidate: ({ currentUrl, nextUrl }) =>
              (currentUrl.pathname === nextUrl.pathname && currentUrl.search === nextUrl.search) ||
              currentUrl.searchParams.get("tab") !== nextUrl.searchParams.get("tab"),
            lazy: async () => {
              const [page, loaderModule] = await Promise.all([
                import("../pages/AdminAttendancePage"),
                import("../features/admin/adminBrowseLoaders"),
              ]);
              return {
                Component: page.AdminAttendancePage,
                loader: loaderModule.adminAttendanceLoader,
              };
            },
          },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];
