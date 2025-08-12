import axios, { AxiosError } from "axios";

// Create axios instance with base configuration
export const api = axios.create({
  baseURL: "https://new.autophontest.se/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Include cookies in requests
});

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        // Try to refresh token using HTTP-only cookie
        await api.post("/auth/refresh");

        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        console.error("Token refresh failed:", refreshError);
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

// Add TypeScript interface imports
import type { LanguagesResponse } from "../types/api";

// Languages API
export const languagesAPI = {
  // Get homepage languages (public endpoint, no auth required)
  getHomepageLanguages: (): Promise<LanguagesResponse> =>
    api.get("/public/languages").then((response) => response.data),

  // Get all languages filtered by type (public endpoint)
  getLanguagesByType: (type?: "nordic" | "other"): Promise<LanguagesResponse> =>
    api.get(`/public/languages?homepage=false${type ? `&type=${type}` : ""}`).then((response) => response.data),
};
