import { Outlet } from "react-router-dom";

import { Header } from "./Header";
import { Footer } from "./Footer";
import { AuthNavigationHandler } from "./AuthNavigationHandler";
import { SiteStatusMonitor } from "./SiteStatusMonitor";
import { usePageTitle } from "../../hooks/usePageTitle";
import backgroundImage from "../../assets/photo-grid_2d.png";
import SiteStatusGuard from "./SiteStatusGuard";
import CurrentNewsModal from "../modals/CurrentNewsModal";

export function Layout() {
  usePageTitle();

  return (
    <div className="min-h-screen flex flex-col">
      <AuthNavigationHandler />
      <SiteStatusMonitor />
      <SiteStatusGuard />
      <Header />
      <main className="flex-1 pt-16">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 md:pt-16 lg:pt-[70px] relative max-w-[1140px]">
          <div className="fixed w-60 md:w-[391px] lg:w-[471px] xl:w-[529px] h-full left-[60%] -translate-x-1/2 top-0 bottom-0 -z-10">
            <div className="w-full h-full bg-base-100">
              <img
                src={backgroundImage}
                alt="background"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div className="pb-8 sm:pb-12 md:pb-16">
            <Outlet />
          </div>
        </div>
      </main>
      <Footer />
      <CurrentNewsModal />
    </div>
  );
}
