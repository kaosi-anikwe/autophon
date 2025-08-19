import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { verifyToken } from "../../store/authSlice";
import { useAppDispatch, useAppSelector } from "../../hooks/useAppDispatch";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const { isAuthenticated, isLoading, isInitialized } = useAppSelector(
    (state) => state.auth
  );

  useEffect(() => {
    // Only verify token if app hasn't been initialized yet
    if (!isInitialized && !isLoading) {
      dispatch(verifyToken());
    }
  }, [dispatch, isInitialized, isLoading]);

  // Show loading only if we're still initializing or actively verifying
  if (isLoading || !isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated (only after initialization is complete)
  if (isInitialized && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
