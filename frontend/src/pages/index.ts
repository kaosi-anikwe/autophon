import { lazy } from "react";

// Lazy load all pages for better code splitting
export const HomePage = lazy(() =>
  import("./HomePage").then((m) => ({ default: m.HomePage }))
);
export const DashboardPage = lazy(() =>
  import("./AlignerPage").then((m) => ({ default: m.AlignerPage }))
);
export const RegisterPage = lazy(() =>
  import("./RegisterPage").then((m) => ({ default: m.RegisterPage }))
);
export const ProfilePage = lazy(() =>
  import("./ProfilePage").then((m) => ({ default: m.ProfilePage }))
);
export const TeamPage = lazy(() =>
  import("./TeamPage").then((m) => ({ default: m.TeamPage }))
);
export const AboutPage = lazy(() =>
  import("./AboutPage").then((m) => ({ default: m.AboutPage }))
);
export const SupportPage = lazy(() =>
  import("./SupportPage").then((m) => ({ default: m.SupportPage }))
);
export const HistoryPage = lazy(() =>
  import("./HistoryPage").then((m) => ({ default: m.HistoryPage }))
);
export const AdminPage = lazy(() =>
  import("./AdminPage").then((m) => ({ default: m.AdminPage }))
);
export const LogoutPage = lazy(() =>
  import("./LogoutPage").then((m) => ({ default: m.LogoutPage }))
);
export const VerifyEmailPage = lazy(() => import("./VerifyEmail"));
export const ResetPasswordPage = lazy(() => import("./ResetPassword"));
export const NotFoundPage = lazy(() => import("./NotFound"));
export const ServerErrorPage = lazy(() => import("./ServerError"));
export const AdminLoginPage = lazy(() => import("./AdminLoginPage"));
