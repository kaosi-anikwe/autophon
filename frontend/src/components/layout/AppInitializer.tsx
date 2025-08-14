import { useEffect } from "react";

import spinnerGif from "../../assets/spinner.gif";
import { verifyToken, clearAuth } from "../../store/authSlice";
import { useAppDispatch, useAppSelector } from "../../hooks/useAppDispatch";

interface AppInitializerProps {
  children: React.ReactNode;
}

export function AppInitializer({ children }: AppInitializerProps) {
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector((state) => state.auth);

  useEffect(() => {
    // Always try to verify session on startup
    // The API interceptor will handle the case where no cookies exist
    dispatch(verifyToken());
  }, [dispatch]);

  useEffect(() => {
    // Listen for logout events from API interceptor
    const handleAuthLogout = () => {
      dispatch(clearAuth());
    };

    window.addEventListener('auth:logout', handleAuthLogout);
    
    return () => {
      window.removeEventListener('auth:logout', handleAuthLogout);
    };
  }, [dispatch]);

  // Show loading on initial app load while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <img className="w-24 h-auto" src={spinnerGif} alt="loading" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
