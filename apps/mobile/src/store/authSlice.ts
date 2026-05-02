import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { AuthenticatedUser } from "@compound/contracts";
import { RootState } from "../store";

interface AuthState {
  token: string | null;
  user: AuthenticatedUser | null;
  permissions: string[];
  isRestoring: boolean;
}

const initialState: AuthState = {
  token: "test-token",
  user: {
    id: "admin-1",
    name: "Audit Admin",
    email: "uat-compound-admin@compound.local",
    role: "compound_admin",
    roles: ["compound_admin"],
    compoundId: "compound-1",
    permissions: ["view_admin", "manage_visitors", "view_finance"]
  } as any,
  permissions: ["view_admin", "manage_visitors", "view_finance"],
  isRestoring: false,
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
      state.permissions = action.payload.user.permissions ?? [];
      state.isRestoring = false;
    },
    setToken: (state, action: PayloadAction<string | null>) => {
      state.token = action.payload;
      if (!action.payload) {
        state.user = null;
        state.permissions = [];
      }
    },
    setUser: (state, action: PayloadAction<AuthenticatedUser | null>) => {
      state.user = action.payload;
      state.permissions = action.payload?.permissions ?? [];
      state.isRestoring = false;
    },
    setRestoring: (state, action: PayloadAction<boolean>) => {
      state.isRestoring = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.permissions = [];
      state.isRestoring = false;
    },
  },
});

export const { setCredentials, setToken, setUser, setRestoring, logout } = authSlice.actions;
export default authSlice.reducer;

export const selectCurrentUser = (state: RootState) => state.auth.user;
export const selectCurrentToken = (state: RootState) => state.auth.token;
export const selectIsRestoring = (state: RootState) => state.auth.isRestoring;
export const selectPermissions = (state: RootState) => state.auth.permissions;
