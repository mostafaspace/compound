import { createApi, fetchBaseQuery, BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import * as Keychain from "react-native-keychain";
import { Platform } from "react-native";
import { setOfflineState } from "../store/systemSlice";
import { logout } from "../store/authSlice";

const authTokenService = "compound.mobile.authToken";

const defaultApiBaseUrl = Platform.select({
  android: "http://10.0.2.2:8000/api/v1",
  ios: "http://localhost:8000/api/v1",
  default: "http://localhost:8000/api/v1",
});

const baseQuery = fetchBaseQuery({
  baseUrl: defaultApiBaseUrl,
  prepareHeaders: (headers, { getState }) => {
    headers.set("Accept", "application/json");
    const token = (getState() as any).auth.token;
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

const baseQueryWithFallback: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 'FETCH_ERROR') {
    api.dispatch(setOfflineState({ isOffline: true, error: "Network Error: Could not connect to server" }));
  } else if (result.error && result.error.status === 401) {
    api.dispatch(logout());
    await Keychain.resetGenericPassword({ service: authTokenService });

    const state = api.getState() as any;
    if (state.system?.isOffline) {
      api.dispatch(setOfflineState({ isOffline: false }));
    }
  } else {
    const state = api.getState() as any;
    if (state.system?.isOffline) {
       api.dispatch(setOfflineState({ isOffline: false }));
    }
  }

  return result;
};

export const api = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithFallback,
  tagTypes: [
    "User",
    "VerificationRequest",
    "UnitMembership",
    "VisitorRequest",
    "Issue",
    "Notification",
    "Announcement",
    "Finance",
    "Vote",
    "Poll",
    "UnitAccount",
    "UserDocument",
    "PolicyConsent",
  ],
  endpoints: () => ({}),
});
