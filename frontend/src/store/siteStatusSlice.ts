import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { adminAPI, getErrorMessage } from "../lib/api";
import type { SiteStatus } from "@/types/api";

interface SiteStatusState {
  status: SiteStatus | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  lastChecked: string | null;
}

const initialState: SiteStatusState = {
  status: null,
  isLoading: false,
  isInitialized: false,
  error: null,
  lastChecked: null,
};

// Async thunk to fetch site status
export const fetchSiteStatus = createAsyncThunk(
  "siteStatus/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const response = await adminAPI.getSiteStatus();
      return response;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      return rejectWithValue(errorMessage);
    }
  }
);

const siteStatusSlice = createSlice({
  name: "siteStatus",
  initialState,
  reducers: {
    clearSiteStatus: (state) => {
      state.status = null;
      state.isInitialized = false;
      state.error = null;
      state.lastChecked = null;
    },
    clearSiteStatusError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSiteStatus.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSiteStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isInitialized = true;
        state.status = action.payload;
        state.error = null;
        state.lastChecked = new Date().toISOString();
      })
      .addCase(fetchSiteStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.isInitialized = true;
        state.error = action.payload as string;
        state.lastChecked = new Date().toISOString();
      });
  },
});

export const { clearSiteStatus, clearSiteStatusError } = siteStatusSlice.actions;
export default siteStatusSlice.reducer;