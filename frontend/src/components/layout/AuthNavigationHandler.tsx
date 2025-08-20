import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import { useAppSelector } from "../../hooks/useAppDispatch";
import { useToast } from "../../hooks/useToast";

// Type declaration for global flag
declare global {
  interface Window {
    __hasAuthenticated?: boolean;
  }
}

export function AuthNavigationHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const hasRedirectedRef = useRef(false);

  // Handle post-login navigation and welcome message
  useEffect(() => {
    if (isAuthenticated && user && !hasRedirectedRef.current) {
      const isOnLoginPage = location.pathname === "/login";
      const hasLoginFragment = location.hash === "#login";
      const hasJustAuthenticated =
        typeof window !== "undefined" ? window.__hasAuthenticated : false;
      const fromProtectedRoute = location.state?.from?.pathname;

      // Only redirect in these cases:
      // 1. User just logged in (hasJustAuthenticated is true)
      // 2. User is on /login page (explicit login page)
      // 3. User has #login fragment (login form state)
      // 4. User was redirected from a protected route
      if (
        hasJustAuthenticated ||
        isOnLoginPage ||
        hasLoginFragment ||
        fromProtectedRoute
      ) {
        if (hasJustAuthenticated) {
          console.log(
            "AuthNavigationHandler: User authenticated after login, showing welcome and navigating to dashboard"
          );
          toast.success(
            `Welcome back, ${user.first_name}!`,
            "Login Successful"
          );

          // Clear the flag after showing the welcome message
          if (typeof window !== "undefined") {
            window.__hasAuthenticated = false;
          }
        } else {
          console.log(
            "AuthNavigationHandler: Redirecting authenticated user to dashboard"
          );
        }

        navigate(fromProtectedRoute || "/aligner");
        hasRedirectedRef.current = true;
      }
    }
  }, [isAuthenticated, user, location, navigate, toast]);

  // Reset redirect flag when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      hasRedirectedRef.current = false;
    }
  }, [isAuthenticated]);

  // This component doesn't render anything
  return null;
}
