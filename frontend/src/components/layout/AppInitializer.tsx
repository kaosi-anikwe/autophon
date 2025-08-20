import { useEffect } from "react";

import spinnerGif from "../../assets/spinner.gif";
import { verifyToken, clearAuth } from "../../store/authSlice";
import { fetchSiteStatus } from "../../store/siteStatusSlice";
import { useAppDispatch, useAppSelector } from "../../hooks/useAppDispatch";

interface AppInitializerProps {
  children: React.ReactNode;
}

export function AppInitializer({ children }: AppInitializerProps) {
  const dispatch = useAppDispatch();
  const { isLoading, isInitialized } = useAppSelector((state) => state.auth);
  const { isLoading: siteStatusLoading, isInitialized: siteStatusInitialized } =
    useAppSelector((state) => state.siteStatus);

  useEffect(() => {
    // Always try to verify session on startup
    // The API interceptor will handle the case where no cookies exist
    dispatch(verifyToken());

    // Also fetch site status on startup
    dispatch(fetchSiteStatus());
  }, [dispatch]);

  useEffect(() => {
    // Listen for logout events from API interceptor
    const handleAuthLogout = () => {
      dispatch(clearAuth());
    };

    window.addEventListener("auth:logout", handleAuthLogout);

    return () => {
      window.removeEventListener("auth:logout", handleAuthLogout);
    };
  }, [dispatch]);

  // Show loading on initial app load while checking auth and site status
  if (
    (isLoading && !isInitialized) ||
    (siteStatusLoading && !siteStatusInitialized)
  ) {
    return (
      <div className="flex items-center justify-center min-h-[38rem]">
        <div className="text-center">
          <img className="w-24 h-auto" src={spinnerGif} alt="loading" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
