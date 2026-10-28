import type { RouteObject } from "react-router";
import { countryCodesLoader } from "../services/countryCodes";
import { adminAccountAction } from "../features/admin/adminAccountAction";
import { demoAction } from "../features/landing/contactRequestAction";
import { homeAction } from "../features/landing/homeAction";
import { UseCasePage } from "../features/use-case/components/UseCasePage";
import { ALL_USE_CASE_CONTENT } from "../features/use-case/content/registry";
import { AttendancePage } from "../pages/AttendancePage";
import { FeaturesPage } from "../pages/FeaturesPage";
import { HomePage } from "../pages/HomePage";
import { BookDemoPage, DataSafetyPage, PartnersPage, PricingPage } from "../pages/InfoPages";
import { NotFoundPage } from "../pages/NotFoundPage";
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
        // Early-access and call-back forms both post here; homeAction picks by intent.
        action: homeAction,
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
              };
            },
          },
          {
            path: "company/jobs",
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
