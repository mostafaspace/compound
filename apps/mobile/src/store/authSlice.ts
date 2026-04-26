import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { AuthenticatedUser } from "@compound/contracts";
import { RootState } from "../store";

interface AuthState {
  token: string | null;
  user: AuthenticatedUser | null;
  isRestoring: boolean;
}

const initialState: AuthState = {
  token: null,
  user: null,
  isRestoring: true,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: AuthenticatedUser; token: string }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isRestoring = false;
    },
    setToken: (state, action: PayloadAction<string | null>) => {
      state.token = action.payload;
      if (!action.payload) {
        state.user = null;
      }
    },
    setUser: (state, action: PayloadAction<AuthenticatedUser | null>) => {
      state.user = action.payload;
      state.isRestoring = false;
    },
    setRestoring: (state, action: PayloadAction<boolean>) => {
      state.isRestoring = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isRestoring = false;
    },
  },
});

export const { setCredentials, setToken, setUser, setRestoring, logout } = authSlice.actions;

export default authSlice.reducer;

export const selectCurrentUser = (state: RootState) => state.auth.user;
export const selectCurrentToken = (state: RootState) => state.auth.token;
export const selectIsRestoring = (state: RootState) => state.auth.isRestoring;
