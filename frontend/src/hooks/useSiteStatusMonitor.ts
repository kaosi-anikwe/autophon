import { useNavigate } from "react-router-dom";
import { useCallback, useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "./useAppDispatch";

import { logout } from "@/store/authSlice";
import { useToast } from "@/contexts/ToastContext";
import { fetchSiteStatus } from "@/store/siteStatusSlice";

interface UseSiteStatusMonitorOptions {
  enabled?: boolean; // Allow disabling the monitor
  interval?: number; // Check interval in milliseconds (default: 5 minutes)
}

export function useSiteStatusMonitor({
  enabled = true,
  interval = 5 * 60 * 1000, // 5 minutes
}: UseSiteStatusMonitorOptions = {}) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const toast = useToast();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const { status: siteStatus, isInitialized } = useAppSelector(
    (state) => state.siteStatus
  );

  // Function to handle site becoming inactive
  const handleSiteInactive = useCallback(async () => {
    // Only show toast and logout if user is not an admin
    if (isAuthenticated && user && !user.admin) {
      toast.warning(
        "The site is now under maintenance. You will be logged out.",
        "Maintenance Mode"
      );

      // Wait a moment for the toast to show, then logout and redirect
      setTimeout(async () => {
        try {
          await dispatch(logout()).unwrap();
        } catch {
          // Ignore logout errors, just clear local state
        } finally {
          navigate("/", { replace: true });
        }
      }, 2000);
    } else if (!isAuthenticated) {
      // If not authenticated, just redirect to home (which will show maintenance page)
      navigate("/", { replace: true });
    }
    // Admin users are not affected by site maintenance
  }, [dispatch, navigate, toast, isAuthenticated, user]);

  // Function to check site status
  const checkSiteStatus = useCallback(async () => {
    try {
      const result = await dispatch(fetchSiteStatus()).unwrap();

      // If site becomes inactive and we have a previous status that was active
      if (!result.active && siteStatus?.active) {
        handleSiteInactive();
      }
    } catch (error) {
      // Silently handle errors - don't disrupt user experience
      console.warn("Site status check failed:", error);
    }
  }, [dispatch, handleSiteInactive, siteStatus?.active]);

  useEffect(() => {
    if (!enabled || !isInitialized) {
      return;
    }

    // Set up periodic checking
    intervalRef.current = setInterval(checkSiteStatus, interval);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [
    enabled,
    isInitialized,
    interval,
    siteStatus?.active,
    isAuthenticated,
    user?.admin,
    checkSiteStatus,
  ]);

  // Manual check function that can be called by components
  const manualCheck = () => {
    if (enabled && isInitialized) {
      checkSiteStatus();
    }
  };

  return {
    isMonitoring: enabled && isInitialized && intervalRef.current !== null,
    manualCheck,
  };
}
