import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { AuthNavigationHandler } from "./AuthNavigationHandler";
import { usePageTitle } from "../../hooks/usePageTitle";

export function AdminLayout() {
  usePageTitle();
  
  return (
    <div className="min-h-screen flex flex-col">
      <AuthNavigationHandler />
      <Header />
      <main className="flex-1 pt-16">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}