import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { AuthNavigationHandler } from "./AuthNavigationHandler";
import { SiteStatusMonitor } from "./SiteStatusMonitor";
import { usePageTitle } from "../../hooks/usePageTitle";
import SiteStatusGuard from "./SiteStatusGuard";

export function AdminLayout() {
  usePageTitle();

  return (
    <div className="min-h-screen flex flex-col">
      <AuthNavigationHandler />
      <SiteStatusMonitor />
      <SiteStatusGuard />
      <Header />
      <main className="flex-1 pt-20">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
