import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAppSelector } from "@/hooks/useAppDispatch";

interface SiteStatusGuardProps {
  bypassCheck?: boolean; // Allow bypassing the site status check
}

export function SiteStatusGuard({ bypassCheck = false }: SiteStatusGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { status, isInitialized } = useAppSelector((state) => state.siteStatus);
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  useEffect(() => {
    // Only redirect if we're not already on the homepage and site is inactive
    if (
      isInitialized &&
      status &&
      !status.active &&
      !user?.admin &&
      !bypassCheck &&
      location.pathname !== "/" &&
      location.pathname !== "/about" &&
      location.pathname !== "/team" &&
      location.pathname !== "/support" &&
      location.pathname !== "/admin-login"
    ) {
      navigate("/", { replace: true });
    }
  }, [isInitialized, status, user, bypassCheck, location.pathname, navigate]);

  useEffect(() => {
    if (
      isInitialized &&
      isAuthenticated &&
      status &&
      status.active &&
      user &&
      !user?.verified &&
      location.pathname === "/aligner"
    ) {
      navigate("/", { replace: true });
    }
  }, [navigate, user, location]);

  // For any other route when site is inactive, render nothing (redirect will handle it)
  return null;
}

export default SiteStatusGuard;
