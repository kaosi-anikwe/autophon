import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

import { authAPI, getErrorMessage } from "../lib/api";
import type { LoginRequest, RegisterRequest } from "../lib/api";
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
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
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

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearAuth: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
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
        state.isAuthenticated = true;
        state.user = action.payload;
        state.error = null;
        // Don't set __hasAuthenticated for token verification - only for actual login/register
      })
      .addCase(verifyToken.rejected, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
      });

    // Logout
    builder
      .addCase(logout.fulfilled, (state) => {
        state.isAuthenticated = false;
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
  },
});

export const { clearError, clearAuth } = authSlice.actions;
export default authSlice.reducer;
