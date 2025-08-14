import { useAppConfig } from "../../contexts/AppConfigContext";

interface AppConfigErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AppConfigErrorBoundary({ children, fallback }: AppConfigErrorBoundaryProps) {
  const { error, isLoading, refetchConfig } = useAppConfig();

  // If there's an error and we're not loading, show the error state
  if (error && !isLoading) {
    return (
      fallback || (
        <div className="min-h-screen flex items-start justify-center bg-base-200 pt-16">
          <div className="card w-96 bg-base-100 shadow-xl">
            <div className="card-body text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="card-title justify-center text-error">
                Configuration Error
              </h2>
              <p className="text-base-content/70">
                The application configuration could not be loaded. This may affect some features.
              </p>
              <p className="text-sm text-base-content/50 mt-2">
                Error: {error.message}
              </p>
              <div className="card-actions justify-center mt-4">
                <button 
                  className="btn btn-primary"
                  onClick={refetchConfig}
                >
                  Retry Configuration
                </button>
                <button 
                  className="btn btn-ghost"
                  onClick={() => window.location.reload()}
                >
                  Reload Page
                </button>
              </div>
              <div className="mt-4 p-3 bg-warning/10 rounded-lg">
                <p className="text-xs text-warning">
                  You can continue using the app, but some features may not work as expected.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    );
  }

  return <>{children}</>;
}

export default AppConfigErrorBoundary;