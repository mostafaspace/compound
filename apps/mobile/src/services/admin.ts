import { api } from "./api";
import type {
  OperationalAnalytics,
  OperationalAnalyticsFilters,
  ApiEnvelope,
  CreateUnitMembershipInput,
  UnitDetail,
  UnitMembership,
  UpdateUnitMembershipInput,
} from "@compound/contracts";

export interface UnassignedResidentUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  photoUrl?: string | null;
  createdAt?: string;
}

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
    getUnit: builder.query<UnitDetail, string>({
      query: (unitId) => `/units/${unitId}`,
      transformResponse: (response: ApiEnvelope<UnitDetail>) => response.data,
      providesTags: (_result, _error, id) => [{ type: "UnitMembership", id }],
    }),
    getResidentInvitations: builder.query<any[], void>({
      query: () => "/resident-invitations",
      transformResponse: (response: any) => response.data,
      providesTags: ["Admin"],
    }),
    getUnassignedUsers: builder.query<UnassignedResidentUser[], void>({
      query: () => "/units/unassigned-users",
      transformResponse: (response: ApiEnvelope<ApiEnvelope<UnassignedResidentUser[]>>) =>
        response.data.data,
      providesTags: ["Admin", "UnitMembership"],
    }),
    createResidentInvitation: builder.mutation<any, any>({
      query: (body) => ({
        url: "/resident-invitations",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Admin"],
    }),
    createUnitMembership: builder.mutation<UnitMembership, { unitId: string; body: CreateUnitMembershipInput }>({
      query: ({ unitId, body }) => ({
        url: `/units/${unitId}/memberships`,
        method: "POST",
        body,
      }),
      transformResponse: (response: ApiEnvelope<UnitMembership>) => response.data,
      invalidatesTags: ["Admin", "UnitMembership"],
    }),
    updateUnitMembership: builder.mutation<UnitMembership, { membershipId: number; body: UpdateUnitMembershipInput }>({
      query: ({ membershipId, body }) => ({
        url: `/unit-memberships/${membershipId}`,
        method: "PATCH",
        body,
      }),
      transformResponse: (response: ApiEnvelope<UnitMembership>) => response.data,
      invalidatesTags: ["Admin", "UnitMembership"],
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
    getAuditLogs: builder.query<any[], any | void>({
      query: (filters) => {
        const params = new URLSearchParams();
        if (filters) {
          if (filters.action) params.set("action", filters.action);
          if (filters.severity) params.set("severity", filters.severity);
          if (filters.module) params.set("module", filters.module);
          if (filters.q) params.set("q", filters.q);
        }
        const query = params.toString();
        return `/audit-logs${query ? `?${query}` : ""}`;
      },
      transformResponse: (response: any) => response.data,
      providesTags: ["Admin"],
    }),
    getAuditLogTimeline: builder.query<any[], { entity_type: string; entity_id: string }>({
      query: ({ entity_type, entity_id }) => `/audit-logs/timeline?entity_type=${entity_type}&entity_id=${entity_id}`,
      transformResponse: (response: any) => response.data,
      providesTags: ["Admin"],
    }),
  }),
});

export const {
  useGetOperationalAnalyticsQuery,
  useGetBuildingsQuery,
  useGetUnitsByBuildingQuery,
  useGetUnitQuery,
  useGetResidentInvitationsQuery,
  useGetUnassignedUsersQuery,
  useCreateResidentInvitationMutation,
  useCreateUnitMembershipMutation,
  useUpdateUnitMembershipMutation,
  useGetFinanceUnitAccountsQuery,
  useGetFinancePaymentSubmissionsQuery,
  useApprovePaymentMutation,
  useRejectPaymentMutation,
  useGetAuditLogsQuery,
  useGetAuditLogTimelineQuery,
} = adminApi;
