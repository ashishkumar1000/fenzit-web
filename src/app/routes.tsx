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

/**
 * Every route in the app. Kept free of browser-only code, so the build can render it on the
 * server for the static pages, and tests can build a memory router from the same table.
 *
 * The use-case pages share one template; the registry pairs each path with its content.
 */
export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
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
            // The layout loader fetches /users/me and — for an owner — the full
            // reports dashboard. Those only matter when /admin itself is on
            // screen, so a navigation to any other console section (or an
            // action on one) skips the refetch; returning to /admin revalidates.
            shouldRevalidate: ({ nextUrl }) => nextUrl.pathname === "/admin",
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
                import("../features/admin/adminBrowseLoaders"),
              ]);
              return {
                Component: page.AdminHolidaysPage,
                loader: loaderModule.adminHolidaysLoader,
              };
            },
          },
          {
            path: "company/attendance",
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
