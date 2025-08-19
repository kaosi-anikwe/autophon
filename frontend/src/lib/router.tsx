import { createBrowserRouter } from "react-router-dom";
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

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: "login",
        element: <HomePage />,
      },
      {
        path: "register",
        element: <RegisterPage />,
      },
      {
        path: "verify-email",
        element: <VerifyEmailPage />,
      },
      {
        path: "reset-password",
        element: <ResetPasswordPage />,
      },
      {
        path: "500",
        element: <ServerErrorPage />,
      },
      {
        path: "admin-login",
        element: <AdminLoginPage />,
      },
      {
        path: "profile",
        element: (
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        ),
      },
      {
        path: "team",
        element: <TeamPage />,
      },
      {
        path: "about",
        element: <AboutPage />,
      },
      {
        path: "support",
        element: <SupportPage />,
      },
      {
        path: "logout",
        element: <LogoutPage />,
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
            <HistoryPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: "/dashboard",
    element: <AdminLayout />,
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute>
            <DashboardPage />
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
            <AdminPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);
