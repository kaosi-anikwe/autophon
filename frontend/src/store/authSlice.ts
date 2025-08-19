import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

import { authAPI, profileAPI, getErrorMessage } from "../lib/api";
import type { LoginRequest, RegisterRequest, UpdateProfileRequest } from "../lib/api";
import type { User } from "@/types/api";

// export interface User {
//   id: number;
//   email: string;
//   first_name: string;
//   last_name: string;
//   title?: string;
//   org?: string;
//   industry?: string;
//   admin: boolean;
//   created_at: string;
// }

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean; // Track if initial auth check is complete
  error: string | null;
  verificationLoading: boolean;
  verificationError: string | null;
  resetPasswordLoading: boolean;
  resetPasswordError: string | null;
  resetPasswordSuccess: boolean;
  deleteAccountLoading: boolean;
  deleteAccountError: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  error: null,
  verificationLoading: false,
  verificationError: null,
  resetPasswordLoading: false,
  resetPasswordError: null,
  resetPasswordSuccess: false,
  deleteAccountLoading: false,
  deleteAccountError: null,
};

// Async thunks for auth actions
export const login = createAsyncThunk(
  "auth/login",
  async (credentials: LoginRequest, { rejectWithValue }) => {
    try {
      const response = await authAPI.login(credentials);
      return response.user;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      return rejectWithValue(errorMessage);
    }
  }
);

export const register = createAsyncThunk(
  "auth/register",
  async (userData: RegisterRequest, { rejectWithValue }) => {
    try {
      const response = await authAPI.register(userData);
      return response.user;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      return rejectWithValue(errorMessage);
    }
  }
);

export const verifyToken = createAsyncThunk(
  "auth/verify",
  async (_, { rejectWithValue }) => {
    try {
      const response = await authAPI.verify();
      return response.user;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      return rejectWithValue(errorMessage);
    }
  }
);

export const logout = createAsyncThunk(
  "auth/logout",
  async (_, { rejectWithValue }) => {
    try {
      await authAPI.logout();
      // Server will clear HTTP-only cookies
    } catch (error) {
      // Even if logout fails on server, we should clear local state
      console.error("Logout API call failed:", error);
      const errorMessage = getErrorMessage(error);
      return rejectWithValue(errorMessage);
    }
  }
);

export const updateProfile = createAsyncThunk(
  "auth/updateProfile",
  async (profileData: UpdateProfileRequest, { rejectWithValue }) => {
    try {
      const response = await profileAPI.updateProfile(profileData);
      return response.user;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      return rejectWithValue(errorMessage);
    }
  }
);

export const sendEmailVerification = createAsyncThunk(
  "auth/sendEmailVerification",
  async (_, { rejectWithValue }) => {
    try {
      const response = await profileAPI.sendEmailVerification();
      return response.message;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      return rejectWithValue(errorMessage);
    }
  }
);

export const resetPassword = createAsyncThunk(
  "auth/resetPassword",
  async (email: string, { rejectWithValue }) => {
    try {
      await authAPI.resetPassword(email);
      return email;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      return rejectWithValue(errorMessage);
    }
  }
);

export const deleteAccount = createAsyncThunk(
  "auth/deleteAccount",
  async (_, { rejectWithValue }) => {
    try {
      const response = await profileAPI.deleteProfile();
      return response.message;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      return rejectWithValue(errorMessage);
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearVerificationError: (state) => {
      state.verificationError = null;
    },
    clearResetPasswordState: (state) => {
      state.resetPasswordLoading = false;
      state.resetPasswordError = null;
      state.resetPasswordSuccess = false;
    },
    clearAuth: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.isInitialized = false; // Reset initialization state
      state.error = null;
      state.verificationLoading = false;
      state.verificationError = null;
      state.resetPasswordLoading = false;
      state.resetPasswordError = null;
      state.resetPasswordSuccess = false;
      state.deleteAccountLoading = false;
      state.deleteAccountError = null;
      // Clear global flag when auth is cleared
      if (typeof window !== "undefined") {
        window.__hasAuthenticated = false;
      }
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload;
        state.error = null;
        // Set global flag to indicate we've had successful auth in this session
        if (typeof window !== "undefined") {
          window.__hasAuthenticated = true;
        }
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.error =
          typeof action.payload === "string" ? action.payload : "Login failed";
      });

    // Register
    builder
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload;
        state.error = null;
        // Set global flag to indicate we've had successful auth in this session
        if (typeof window !== "undefined") {
          window.__hasAuthenticated = true;
        }
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.error =
          typeof action.payload === "string"
            ? action.payload
            : "Registration failed";
      });

    // Verify token
    builder
      .addCase(verifyToken.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(verifyToken.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isInitialized = true;
        state.isAuthenticated = true;
        state.user = action.payload;
        state.error = null;
        // Don't set __hasAuthenticated for token verification - only for actual login/register
      })
      .addCase(verifyToken.rejected, (state) => {
        state.isLoading = false;
        state.isInitialized = true;
        state.isAuthenticated = false;
        state.user = null;
      });

    // Logout
    builder
      .addCase(logout.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.isInitialized = false; // Reset initialization state on logout
        state.user = null;
        state.error = null;
        // Clear global flag on logout
        if (typeof window !== "undefined") {
          window.__hasAuthenticated = false;
        }
      })
      .addCase(logout.rejected, (state) => {
        // Even if logout fails, clear the local state
        state.isAuthenticated = false;
        state.user = null;
        state.error = null;
        // Clear global flag on logout
        if (typeof window !== "undefined") {
          window.__hasAuthenticated = false;
        }
      });

    // Update Profile
    builder
      .addCase(updateProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error =
          typeof action.payload === "string"
            ? action.payload
            : "Profile update failed";
      });

    // Send Email Verification
    builder
      .addCase(sendEmailVerification.pending, (state) => {
        state.verificationLoading = true;
        state.verificationError = null;
      })
      .addCase(sendEmailVerification.fulfilled, (state) => {
        state.verificationLoading = false;
        state.verificationError = null;
      })
      .addCase(sendEmailVerification.rejected, (state, action) => {
        state.verificationLoading = false;
        state.verificationError =
          typeof action.payload === "string"
            ? action.payload
            : "Email verification failed";
      });

    // Reset Password
    builder
      .addCase(resetPassword.pending, (state) => {
        state.resetPasswordLoading = true;
        state.resetPasswordError = null;
        state.resetPasswordSuccess = false;
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.resetPasswordLoading = false;
        state.resetPasswordError = null;
        state.resetPasswordSuccess = true;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.resetPasswordLoading = false;
        state.resetPasswordError =
          typeof action.payload === "string"
            ? action.payload
            : "Password reset failed";
        state.resetPasswordSuccess = false;
      });

    // Delete Account
    builder
      .addCase(deleteAccount.pending, (state) => {
        state.deleteAccountLoading = true;
        state.deleteAccountError = null;
      })
      .addCase(deleteAccount.fulfilled, (state) => {
        // Account deleted successfully - clear all user state
        state.deleteAccountLoading = false;
        state.deleteAccountError = null;
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
        state.verificationLoading = false;
        state.verificationError = null;
        state.resetPasswordLoading = false;
        state.resetPasswordError = null;
        state.resetPasswordSuccess = false;
        // Clear global flag
        if (typeof window !== "undefined") {
          window.__hasAuthenticated = false;
        }
      })
      .addCase(deleteAccount.rejected, (state, action) => {
        state.deleteAccountLoading = false;
        state.deleteAccountError =
          typeof action.payload === "string"
            ? action.payload
            : "Account deletion failed";
      });
  },
});

export const { clearError, clearVerificationError, clearResetPasswordState, clearAuth } = authSlice.actions;
export default authSlice.reducer;
