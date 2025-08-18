import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import type { Dictionary, User } from "../types/api";

// Extend AxiosRequestConfig to include retry flag
interface ExtendedAxiosRequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
  _retryCount?: number;
}

// Global flag to track if user has been authenticated in this session
declare global {
  interface Window {
    __hasAuthenticated?: boolean;
  }
}

// Create axios instance with base configuration
export const api = axios.create({
  baseURL: "https://new.autophontest.se/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Include cookies in requests
  timeout: 30000, // 30 second timeout
});

// Error handling utility
export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    // Handle specific HTTP status codes
    if (error.response) {
      const { status, data } = error.response;

      // Return backend error message if available
      if (data?.message) {
        return data.message;
      }

      if (data?.error) {
        return data.error;
      }

      // Fallback to status-based messages
      switch (status) {
        case 400:
          return "Invalid request. Please check your input.";
        case 401:
          return "You are not authorized. Please login again.";
        case 403:
          return "You don't have permission to perform this action.";
        case 404:
          return "The requested resource was not found.";
        case 409:
          return "A conflict occurred. This resource may already exist.";
        case 422:
          return "The data provided is invalid. Please check your input.";
        case 429:
          return "Too many requests. Please try again later.";
        case 500:
          return "Internal server error. Please try again later.";
        case 502:
          return "Bad gateway. The server is temporarily unavailable.";
        case 503:
          return "Service unavailable. Please try again later.";
        default:
          return `Request failed with status ${status}`;
      }
    }

    // Network or other errors
    if (error.code === "ECONNABORTED") {
      return "Request timed out. Please try again.";
    }

    if (error.message.includes("Network Error")) {
      return "Network error. Please check your connection.";
    }

    return error.message || "An unexpected error occurred.";
  }

  return "An unexpected error occurred.";
};

// Response interceptor to handle token refresh and errors
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as ExtendedAxiosRequestConfig;

    // Handle 401 errors with token refresh
    // Only attempt refresh if:
    // 1. It's a 401 error
    // 2. We haven't already tried to refresh this request
    // 3. It's not a login/register request
    // 4. It's not already a refresh request (avoid infinite loops)
    // 5. It's not a verify request on initial load (no tokens exist yet)
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/login") &&
      !originalRequest.url?.includes("/auth/register") &&
      !originalRequest.url?.includes("/auth/refresh")
    ) {
      // For verify requests, only attempt refresh if we think we might have tokens
      // Since we use HTTP-only cookies, we can't detect them in JS
      // Instead, we'll track auth state in memory to avoid unnecessary refresh attempts
      if (originalRequest.url?.includes("/auth/verify")) {
        // If this is the very first verify request (app startup), don't attempt refresh
        // We'll use a simple flag to track if we've had a successful auth before
        if (!window.__hasAuthenticated) {
          return Promise.reject(error);
        }
      }

      originalRequest._retry = true;

      try {
        // Try to refresh token using HTTP-only cookie
        await api.post("/auth/refresh");

        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear any stored auth state
        console.error("Token refresh failed:", refreshError);

        // Dispatch logout action to clear state
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("auth:logout"));
        }

        return Promise.reject(error);
      }
    }

    // Handle retry logic for certain errors (network issues, 5xx errors)
    if (
      originalRequest &&
      !originalRequest._retryCount &&
      (error.code === "ECONNABORTED" ||
        (error.response?.status && error.response.status >= 500))
    ) {
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;

      if (originalRequest._retryCount <= 2) {
        // Wait before retrying (exponential backoff)
        const delay = Math.pow(2, originalRequest._retryCount) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));

        return api(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);

// Add TypeScript interface imports
import type {
  LanguagesResponse,
  EnginesResponse,
  TeamResponse,
  AppConfig,
  AdminDashboardStats,
  AdminUser,
  UserActionRequest,
  UserActionResponse,
  GenerateUserReportRequest,
  HistoryFile,
  DownloadHistoryFileRequest,
  SiteStatus,
  UpdateSiteStatusRequest,
  BlockedEmailAction,
} from "../types/api";

// Auth API interfaces
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  title?: string;
  org?: string;
  industry?: string;
}

export interface AuthResponse {
  user: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    title?: string;
    org?: string;
    industry?: string;
    admin: boolean;
    created_at: string;
  };
  message: string;
}

// Authentication API
export const authAPI = {
  // Register new user
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await api.post("/auth/register", data);
    return response.data;
  },

  // Login user
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post("/auth/login", data);
    return response.data;
  },

  // Logout user
  logout: async (): Promise<void> => {
    await api.post("/auth/logout");
  },

  // Logout from all devices
  logoutAll: async (): Promise<void> => {
    await api.post("/auth/logout-all");
  },

  // Verify current token/session
  verify: async (): Promise<AuthResponse> => {
    const response = await api.get("/auth/verify");
    return response.data;
  },

  // Refresh access token
  refresh: async (): Promise<void> => {
    await api.post("/auth/refresh");
  },

  // Change password
  changePassword: async (
    currentPassword: string,
    newPassword: string
  ): Promise<void> => {
    await api.put("/auth/change-password", {
      current_password: currentPassword,
      new_password: newPassword,
    });
  },

  // Request password reset
  resetPassword: async (email: string): Promise<void> => {
    await api.post("/auth/reset-password", { email });
  },
};

// Languages API
export const languagesAPI = {
  // Get homepage languages (public endpoint, no auth required)
  getHomepageLanguages: (): Promise<LanguagesResponse> =>
    api.get("/public/languages").then((response) => response.data),

  // Get all languages filtered by type (public endpoint)
  getLanguagesByType: (type?: "nordic" | "other"): Promise<LanguagesResponse> =>
    api
      .get(`/public/languages?homepage=false${type ? `&type=${type}` : ""}`)
      .then((response) => response.data),
};

// Engines API
export const enginesAPI = {
  // Get homepage engines (public endpoint, no auth required)
  getHomepageEngines: (): Promise<EnginesResponse> =>
    api.get("/engines").then((response) => response.data),
};

// Team API
export const teamAPI = {
  // Get team members (public endpoint, no auth required)
  getTeamMembers: (): Promise<TeamResponse> =>
    api.get("/team").then((response) => response.data),
};

// Captcha API interfaces
export interface CaptchaResponse {
  image: string; // base64 data URL
}

export interface CaptchaVerifyRequest {
  text: string;
}

export interface CaptchaVerifyResponse {
  success: boolean;
  message: string;
}

// Captcha API
export const captchaAPI = {
  // Get new captcha image
  getCaptcha: async (): Promise<CaptchaResponse> => {
    const response = await api.get("/auth/register-captcha");
    return response.data;
  },

  // Verify captcha
  verifyCaptcha: async (
    data: CaptchaVerifyRequest
  ): Promise<CaptchaVerifyResponse> => {
    const response = await api.post("/auth/register-captcha", data);
    return response.data;
  },
};

// Profile API interfaces
export interface UpdateProfileRequest {
  first_name?: string;
  last_name?: string;
  title?: string;
  email?: string;
  org?: string;
  industry?: string;
}

// Email verification interfaces
export interface VerifyEmailResponse {
  message: string;
}

// Profile API
export const profileAPI = {
  // Get user profile
  getProfile: async (): Promise<{ user: User }> => {
    const response = await api.get("/profile");
    return response.data;
  },

  // Update user profile
  updateProfile: async (
    data: UpdateProfileRequest
  ): Promise<{ user: User }> => {
    const response = await api.put("/profile", data);
    return response.data;
  },

  // Send email verification
  sendEmailVerification: async (): Promise<VerifyEmailResponse> => {
    const response = await api.post("/auth/send-verification");
    return response.data;
  },

  // Delete user profile (self-deletion)
  deleteProfile: async (): Promise<{ message: string }> => {
    const response = await api.delete("/profile");
    return response.data;
  },
};

// Admin API
export const adminAPI = {
  // Get admin dashboard statistics
  getDashboardStats: async (): Promise<AdminDashboardStats> => {
    const response = await api.get("/admin/dashboard");
    return response.data;
  },

  // Get all users for admin management
  getUsers: async (): Promise<AdminUser[]> => {
    const response = await api.get("/admin/users");
    return response.data.users;
  },

  // Perform user action (verify, make_admin, block, delete)
  performUserAction: async (
    actionData: UserActionRequest
  ): Promise<UserActionResponse> => {
    const response = await api.post("/admin/user-actions", actionData);
    return response.data;
  },

  // Generate user report Excel file
  generateUserReport: async (
    data: GenerateUserReportRequest
  ): Promise<Blob> => {
    const response = await api.post("/admin/downloads/users", data, {
      responseType: "blob",
    });
    return response.data;
  },

  // Get list of available history spreadsheets
  getHistorySpreadsheets: async (): Promise<HistoryFile[]> => {
    const response = await api.get("/admin/downloads/history");
    return response.data.spreadsheets;
  },

  // Download specific history file
  downloadHistoryFile: async (
    data: DownloadHistoryFileRequest
  ): Promise<Blob> => {
    const response = await api.post("/admin/downloads/history", data, {
      responseType: "blob",
    });
    return response.data;
  },

  // Get current site status
  getSiteStatus: async (): Promise<SiteStatus> => {
    const response = await api.get("/admin/site-status");
    return response.data;
  },

  // Update site status
  updateSiteStatus: async (
    data: UpdateSiteStatusRequest
  ): Promise<{ message: string }> => {
    const response = await api.put("/admin/site-status", data);
    return response.data;
  },

  // Get blocked emails list
  getBlockedEmails: async (): Promise<string[]> => {
    const response = await api.get("/admin/blocked-emails");
    return response.data.emails;
  },

  // Add or remove blocked email
  manageBlockedEmail: async (
    data: BlockedEmailAction
  ): Promise<{ message: string }> => {
    const response = await api.post("/admin/blocked-emails", data);
    return response.data;
  },
};

// App configuration API
export const appConfigAPI = {
  // Get application configuration
  getAppConfig: async (): Promise<AppConfig> => {
    const response = await api.get("/config");
    return response.data.data;
  },
};

// Dictionary management API
export const dictionaryAPI = {
  // Upload user dictionary
  uploadDictionary: async (
    lang: string,
    dictContent: string,
    opType: "replace" | "append" = "replace"
  ): Promise<{ message: string }> => {
    const formData = new FormData();

    // Create a text file from the content
    const blob = new Blob([dictContent], { type: "text/plain" });
    const file = new File([blob], "dictionary.txt", { type: "text/plain" });

    formData.append("dict", file);
    formData.append("lang", lang);
    formData.append("opType", opType);

    const response = await api.post("/dictionaries/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  // Get user dictionaries
  getUserDictionaries: async (): Promise<Dictionary[]> => {
    const response = await api.get("/dictionaries/user");
    return response.data;
  },

  // Get user dictionary by language
  getUserDictionaryByLanguage: async (lang: string): Promise<Dictionary> => {
    const response = await api.post("/dictionaries/get", { lang });
    return response.data.data;
  },
};

// Organizations API interfaces
export interface OrganizationsResponse {
  organizations: string[];
  total: number;
}

// Organizations API
export const organizationsAPI = {
  // Get organizations for autocomplete
  getOrganizations: async (query?: string): Promise<OrganizationsResponse> => {
    const params = query ? { q: query } : {};
    const response = await api.get("/organizations", { params });
    return response.data;
  },
};
