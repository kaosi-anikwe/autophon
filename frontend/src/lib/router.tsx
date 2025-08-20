import { createBrowserRouter } from "react-router-dom";
import { Suspense } from "react";

import spinnerGif from "../assets/spinner.gif";
import { Layout } from "../components/layout/Layout";
import { AdminLayout } from "../components/layout/AdminLayout";
import { ProtectedRoute } from "../components/layout/ProtectedRoute";
import {
  HomePage,
  DashboardPage,
  RegisterPage,
  ProfilePage,
  TeamPage,
  AboutPage,
  SupportPage,
  HistoryPage,
  AdminPage,
  LogoutPage,
  VerifyEmailPage,
  ResetPasswordPage,
  NotFoundPage,
  ServerErrorPage,
  AdminLoginPage,
} from "../pages";

// Loading component for Suspense fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[35rem]">
    <div className="text-center">
      <img className="w-24 h-auto" src={spinnerGif} alt="loading" />
    </div>
  </div>
);

// Wrapper component for lazy-loaded pages
const LazyPage = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<PageLoader />}>{children}</Suspense>
);

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: (
          <LazyPage>
            <HomePage />
          </LazyPage>
        ),
      },
      {
        path: "login",
        element: (
          <LazyPage>
            <HomePage />
          </LazyPage>
        ),
      },
      {
        path: "register",
        element: (
          <LazyPage>
            <RegisterPage />
          </LazyPage>
        ),
      },
      {
        path: "verify-email",
        element: (
          <LazyPage>
            <VerifyEmailPage />
          </LazyPage>
        ),
      },
      {
        path: "reset-password",
        element: (
          <LazyPage>
            <ResetPasswordPage />
          </LazyPage>
        ),
      },
      {
        path: "500",
        element: (
          <LazyPage>
            <ServerErrorPage />
          </LazyPage>
        ),
      },
      {
        path: "admin-login",
        element: (
          <LazyPage>
            <AdminLoginPage />
          </LazyPage>
        ),
      },
      {
        path: "profile",
        element: (
          <ProtectedRoute>
            <LazyPage>
              <ProfilePage />
            </LazyPage>
          </ProtectedRoute>
        ),
      },
      {
        path: "team",
        element: (
          <LazyPage>
            <TeamPage />
          </LazyPage>
        ),
      },
      {
        path: "about",
        element: (
          <LazyPage>
            <AboutPage />
          </LazyPage>
        ),
      },
      {
        path: "support",
        element: (
          <LazyPage>
            <SupportPage />
          </LazyPage>
        ),
      },
      {
        path: "logout",
        element: (
          <LazyPage>
            <LogoutPage />
          </LazyPage>
        ),
      },
    ],
  },
  {
    path: "/history",
    element: <AdminLayout />,
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute>
            <LazyPage>
              <HistoryPage />
            </LazyPage>
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: "/aligner",
    element: <AdminLayout />,
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute>
            <LazyPage>
              <DashboardPage />
            </LazyPage>
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: "/admin",
    element: <AdminLayout />,
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute>
            <LazyPage>
              <AdminPage />
            </LazyPage>
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: "*",
    element: (
      <LazyPage>
        <NotFoundPage />
      </LazyPage>
    ),
  },
]);
