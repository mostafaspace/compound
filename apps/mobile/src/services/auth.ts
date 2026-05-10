import { api } from "./api";
import type { ApiEnvelope, AuthenticatedUser, LoginResult } from "@compound/contracts";
import { Platform } from "react-native";

type ForgotPasswordResult = {
  status: string;
  message: string;
  resetToken?: string;
};

export const authApi = api.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<LoginResult, any>({
      query: (credentials) => ({
        url: "/auth/login",
        method: "POST",
        cache: "no-store",
        headers: {
          "Cache-Control": "no-store, no-cache, max-age=0",
          Pragma: "no-cache",
        },
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
    forgotPassword: builder.mutation<ForgotPasswordResult, { email: string }>({
      query: (body) => ({
        url: "/auth/forgot-password",
        method: "POST",
        body,
      }),
      transformResponse: (response: ApiEnvelope<{ status: string; message: string }>) => ({
        ...response.data,
        resetToken: typeof response.meta?.resetToken === "string" ? response.meta.resetToken : undefined,
      }),
    }),
    resetPassword: builder.mutation<void, { email: string; token: string; password: string; password_confirmation: string }>({
      query: (body) => ({
        url: "/auth/reset-password",
        method: "POST",
        body,
      }),
    }),
    registerDevice: builder.mutation<void, { token: string; platform: string }>({
      query: (data) => ({
        url: "/device-tokens",
        method: "POST",
        body: {
          token: data.token,
          platform: data.platform === "android" ? "fcm" : "apns",
        },
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useGetMeQuery,
  useLogoutMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useRegisterDeviceMutation,
} = authApi;
