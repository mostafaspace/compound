import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../store";

interface SystemState {
  isOffline: boolean;
  lastError: string | null;
}

const initialState: SystemState = {
  isOffline: false,
  lastError: null,
};

const systemSlice = createSlice({
  name: "system",
  initialState,
  reducers: {
    setOfflineState: (state, action: PayloadAction<{ isOffline: boolean; error?: string }>) => {
      state.isOffline = action.payload.isOffline;
      if (action.payload.error) {
        state.lastError = action.payload.error;
      }
    },
    clearError: (state) => {
      state.lastError = null;
    },
  },
});

export const { setOfflineState, clearError } = systemSlice.actions;

export default systemSlice.reducer;

export const selectIsOffline = (state: RootState) => state.system.isOffline;
export const selectLastError = (state: RootState) => state.system.lastError;
