import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import { useAppSelector } from "../../hooks/useAppDispatch";
import { useToast } from "../../hooks/useToast";

export function AuthNavigationHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const hasRedirectedRef = useRef(false);

  // Handle post-login navigation and welcome message
  useEffect(() => {
    if (isAuthenticated && user && !hasRedirectedRef.current) {
      const isOnLoginPage = location.pathname === "/" || location.pathname === "/login";
      const hasLoginFragment = location.hash === "#login";
      
      if (isOnLoginPage || hasLoginFragment) {
        console.log("AuthNavigationHandler: User authenticated, showing welcome and navigating to dashboard");
        toast.success(`Welcome back, ${user.first_name}!`, "Login Successful");
        navigate("/dashboard");
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