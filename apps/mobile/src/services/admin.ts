import { api } from "./api";
import type {
  OperationalAnalytics,
  OperationalAnalyticsFilters,
} from "@compound/contracts";

export const adminApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getOperationalAnalytics: builder.query<OperationalAnalytics, OperationalAnalyticsFilters | void>({
      query: (filters) => {
        const params = new URLSearchParams();
        if (filters) {
          if (filters.buildingId) params.set("buildingId", filters.buildingId);
          if (filters.from) params.set("from", filters.from);
          if (filters.to) params.set("to", filters.to);
        }
        const query = params.toString();
        return `/analytics/operational${query ? `?${query}` : ""}`;
      },
      transformResponse: (response: { data: OperationalAnalytics }) => response.data,
      providesTags: ["Admin"],
    }),
    getBuildings: builder.query<any[], string>({
      query: (compoundId) => `/compounds/${compoundId}/buildings`,
      transformResponse: (response: any) => response.data,
      providesTags: ["Admin"],
    }),
    getUnitsByBuilding: builder.query<any[], string>({
      query: (buildingId) => `/buildings/${buildingId}/units`,
      transformResponse: (response: any) => response.data,
      providesTags: ["Admin"],
    }),
    getResidentInvitations: builder.query<any[], void>({
      query: () => "/resident-invitations",
      transformResponse: (response: any) => response.data,
      providesTags: ["Admin"],
    }),
    createResidentInvitation: builder.mutation<any, any>({
      query: (body) => ({
        url: "/resident-invitations",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Admin"],
    }),
    getFinanceUnitAccounts: builder.query<any[], void>({
      query: () => "/finance/unit-accounts",
      transformResponse: (response: any) => response.data,
      providesTags: ["Admin", "Finance"],
    }),
    getFinancePaymentSubmissions: builder.query<any[], string | void>({
      query: (status) => `/finance/payment-submissions${status ? `?status=${status}` : ""}`,
      transformResponse: (response: any) => response.data,
      providesTags: ["Admin", "Finance"],
    }),
    approvePayment: builder.mutation<void, { id: string; description?: string }>({
      query: ({ id, ...body }) => ({
        url: `/finance/payment-submissions/${id}/approve`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Admin", "Finance"],
    }),
    rejectPayment: builder.mutation<void, { id: string; reason: string }>({
      query: ({ id, ...body }) => ({
        url: `/finance/payment-submissions/${id}/reject`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Admin", "Finance"],
    }),
  }),
});

export const {
  useGetOperationalAnalyticsQuery,
  useGetBuildingsQuery,
  useGetUnitsByBuildingQuery,
  useGetResidentInvitationsQuery,
  useCreateResidentInvitationMutation,
  useGetFinanceUnitAccountsQuery,
  useGetFinancePaymentSubmissionsQuery,
  useApprovePaymentMutation,
  useRejectPaymentMutation,
} = adminApi;
