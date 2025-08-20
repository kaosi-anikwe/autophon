import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const pageTitles: Record<string, string> = {
  "/": "Home",
  "/aligner": "Aligner",
  "/login": "Login",
  "/register": "Register",
  "/profile": "Profile",
  "/team": "Team",
  "/about": "About",
  "/support": "Support",
  "/history": "History",
  "/admin": "Admin",
};

export const usePageTitle = () => {
  const location = useLocation();

  useEffect(() => {
    const pageTitle = pageTitles[location.pathname] || "Page";
    document.title = `Autophon | ${pageTitle}`;
  }, [location.pathname]);
};
