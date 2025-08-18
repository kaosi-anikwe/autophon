import { useState, useEffect, useCallback } from "react";
import { organizationsAPI } from "../lib/api";
import { useToast } from "./useToast";

interface UseOrganizationsOptions {
  minQueryLength?: number;
  debounceMs?: number;
  maxResults?: number;
}

interface UseOrganizationsReturn {
  organizations: string[];
  isLoading: boolean;
  error: string | null;
  searchOrganizations: (query: string) => void;
}

export function useOrganizations(
  options: UseOrganizationsOptions = {}
): UseOrganizationsReturn {
  const {
    minQueryLength = 1,
    debounceMs = 300,
    maxResults = 10,
  } = options;

  const [organizations, setOrganizations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const toast = useToast();

  const searchOrganizations = useCallback(
    (query: string) => {
      // Clear existing timer
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      // If query is too short, clear results
      if (query.length < minQueryLength) {
        setOrganizations([]);
        setError(null);
        return;
      }

      // Set up debounced search
      const timer = setTimeout(async () => {
        setIsLoading(true);
        setError(null);

        try {
          const response = await organizationsAPI.getOrganizations(query);
          // Limit results as specified
          const limitedResults = response.organizations.slice(0, maxResults);
          setOrganizations(limitedResults);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "Failed to fetch organizations";
          setError(errorMessage);
          setOrganizations([]);
          
          // Show toast error for API failures, but not for common network issues during typing
          if (!errorMessage.includes("Network Error") && !errorMessage.includes("timeout")) {
            toast.error(errorMessage, "Organizations Error");
          }
        } finally {
          setIsLoading(false);
        }
      }, debounceMs);

      setDebounceTimer(timer);
    },
    [debounceTimer, minQueryLength, debounceMs, maxResults, toast]
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  return {
    organizations,
    isLoading,
    error,
    searchOrganizations,
  };
}