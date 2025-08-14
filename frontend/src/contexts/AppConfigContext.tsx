import { createContext, useContext, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { appConfigAPI } from "../lib/api";
import type { AppConfig } from "../types/api";

interface AppConfigContextValue {
  config: AppConfig | null;
  isLoading: boolean;
  error: Error | null;
  refetchConfig: () => void;
}

const AppConfigContext = createContext<AppConfigContextValue | null>(null);

interface AppConfigProviderProps {
  children: ReactNode;
}

export function AppConfigProvider({ children }: AppConfigProviderProps) {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["app-config"],
    queryFn: appConfigAPI.getAppConfig,
    staleTime: 30 * 60 * 1000, // 30 minutes - config doesn't change frequently
    retry: 3,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  const refetchConfig = () => {
    // Invalidate and refetch the config
    queryClient.invalidateQueries({ queryKey: ["app-config"] });
    refetch();
  };

  const value: AppConfigContextValue = {
    config: data || null,
    isLoading,
    error: error as Error | null,
    refetchConfig,
  };

  return (
    <AppConfigContext.Provider value={value}>
      {/* Global config error banner */}
      {error && !isLoading && (
        <div className="alert alert-error flex shadow-lg sticky top-0 z-50">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <svg
                className="stroke-current shrink-0 h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              <span>
                Application configuration could not be loaded. Some features may
                not work correctly.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="btn btn-sm btn-accent font-thin"
                onClick={refetchConfig}
              >
                Retry
              </button>
              <button
                className="btn btn-sm btn-accent font-thin"
                onClick={() => {
                  // Hide the banner by clearing the error temporarily
                  queryClient.setQueryData(["app-config"], null);
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
      {children}
    </AppConfigContext.Provider>
  );
}

export function useAppConfig(): AppConfigContextValue {
  const context = useContext(AppConfigContext);
  if (!context) {
    throw new Error("useAppConfig must be used within an AppConfigProvider");
  }
  return context;
}

// Convenience hook to get just the config data
export function useConfig(): AppConfig | null {
  const { config } = useAppConfig();
  return config;
}

// Convenience hook to get config with loading state
export function useConfigWithLoading(): {
  config: AppConfig | null;
  isLoading: boolean;
} {
  const { config, isLoading } = useAppConfig();
  return { config, isLoading };
}

// Hook to check if the app is in a degraded state due to config errors
export function useAppDegradedState(): {
  isDegraded: boolean;
  error: Error | null;
  canRetry: boolean;
} {
  const { config, error, isLoading } = useAppConfig();

  return {
    isDegraded: !config && !isLoading && !!error,
    error,
    canRetry: !!error && !isLoading,
  };
}
