import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../store";
import { type AppLanguage } from "../i18n/direction";

interface SystemState {
  isOffline: boolean;
  lastError: string | null;
  connectionStatus: "online" | "no_internet" | "server_unreachable";
  language: AppLanguage;
  colorScheme: "light" | "dark";
}

const initialState: SystemState = {
  isOffline: false,
  lastError: null,
  connectionStatus: "online",
  language: "ar",
  colorScheme: "dark",
};

const systemSlice = createSlice({
  name: "system",
  initialState,
  reducers: {
    setOfflineState: (
      state,
      action: PayloadAction<{
        isOffline: boolean;
        error?: string | null;
        reason?: SystemState["connectionStatus"];
      }>,
    ) => {
      state.isOffline = action.payload.isOffline;
      state.connectionStatus = action.payload.isOffline ? action.payload.reason ?? "server_unreachable" : "online";
      if (action.payload.isOffline) {
        state.lastError = action.payload.error ?? null;
      } else {
        state.lastError = null;
      }
    },
    clearError: (state) => {
      state.lastError = null;
    },
    setLanguagePreference: (state, action: PayloadAction<AppLanguage>) => {
      state.language = action.payload;
    },
    setColorSchemePreference: (state, action: PayloadAction<"light" | "dark">) => {
      state.colorScheme = action.payload;
    },
  },
});

export const { setOfflineState, clearError, setLanguagePreference, setColorSchemePreference } = systemSlice.actions;

export default systemSlice.reducer;

export const selectIsOffline = (state: RootState) => state.system.isOffline;
export const selectLastError = (state: RootState) => state.system.lastError;
export const selectConnectionStatus = (state: RootState) => state.system.connectionStatus;
export const selectLanguagePreference = (state: RootState) => state.system.language;
export const selectColorSchemePreference = (state: RootState) => state.system.colorScheme;
