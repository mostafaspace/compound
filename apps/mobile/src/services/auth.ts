import { api } from "./api";
import type { ApiEnvelope, AuthenticatedUser, LoginResult } from "@compound/contracts";
import { Platform } from "react-native";

export const authApi = api.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<LoginResult, any>({
      query: (credentials) => ({
        url: "/auth/login",
        method: "POST",
        body: {
          ...credentials,
          deviceName: Platform.OS === "web" ? "Mobile web" : `${Platform.OS} app`,
        },
      }),
      transformResponse: (response: ApiEnvelope<LoginResult>) => response.data,
      invalidatesTags: ["User"],
    }),
    getMe: builder.query<AuthenticatedUser, void>({
      query: () => "/auth/me",
      transformResponse: (response: ApiEnvelope<AuthenticatedUser>) => response.data,
      providesTags: ["User"],
    }),
    logout: builder.mutation<void, void>({
      query: () => ({
        url: "/auth/logout",
        method: "POST",
      }),
      invalidatesTags: ["User"],
    }),
  }),
});

export const { useLoginMutation, useGetMeQuery, useLogoutMutation } = authApi;
