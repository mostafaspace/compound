import { api } from "./api";
import type { ApiEnvelope, UserPolicyConsent, PolicyType } from "@compound/contracts";

export const privacyApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getConsents: builder.query<UserPolicyConsent[], void>({
      query: () => "/privacy/consents",
      transformResponse: (response: ApiEnvelope<UserPolicyConsent[]>) => response.data,
      providesTags: ["PolicyConsent"],
    }),
    acceptConsent: builder.mutation<UserPolicyConsent, { policyType: PolicyType; policyVersion: string }>({
      query: (body) => ({
        url: "/privacy/consents",
        method: "POST",
        body,
      }),
      transformResponse: (response: ApiEnvelope<UserPolicyConsent>) => response.data,
      invalidatesTags: ["PolicyConsent"],
    }),
  }),
});

export const { useGetConsentsQuery, useAcceptConsentMutation } = privacyApi;
