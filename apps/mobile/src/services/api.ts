import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import * as Keychain from "react-native-keychain";
import { Platform } from "react-native";

const authTokenService = "compound.mobile.authToken";

const defaultApiBaseUrl = Platform.select({
  android: "http://10.0.2.2:8000/api/v1",
  ios: "http://localhost:8000/api/v1",
  default: "http://localhost:8000/api/v1",
});

export const api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: defaultApiBaseUrl,
    prepareHeaders: (headers, { getState }) => {
      headers.set("Accept", "application/json");
      const token = (getState() as any).auth.token;
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return headers;
    },
  }),
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
  ],
  endpoints: () => ({}),
});
