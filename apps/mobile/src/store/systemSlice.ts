import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../store";
import { type AppLanguage } from "../i18n/direction";
import { I18nManager } from "react-native";

interface SystemState {
  isOffline: boolean;
  lastError: string | null;
  language: AppLanguage;
  colorScheme: "light" | "dark";
}

const initialState: SystemState = {
  isOffline: false,
  lastError: null,
  language: "en", // Default to English to avoid boot loops if restoration is slow
  colorScheme: "dark",
};

const systemSlice = createSlice({
  name: "system",
  initialState,
  reducers: {
    setOfflineState: (state, action: PayloadAction<{ isOffline: boolean; error?: string }>) => {
      state.isOffline = action.payload.isOffline;
      if (action.payload.error) {
        state.lastError = action.payload.error;
      } else if (!action.payload.isOffline) {
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
export const selectLanguagePreference = (state: RootState) => state.system.language;
export const selectColorSchemePreference = (state: RootState) => state.system.colorScheme;
