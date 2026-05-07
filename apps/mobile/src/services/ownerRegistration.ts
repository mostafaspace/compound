import { api } from "./api";
import type {
  ApiEnvelope,
  OwnerRegistrationBuilding,
  OwnerRegistrationBuildingsResponse,
  OwnerRegistrationRequest,
  PaginatedEnvelope,
} from "@compound/contracts";

export const ownerRegistrationApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getOwnerRegistrationBuildings: builder.query<OwnerRegistrationBuilding[], void>({
      query: () => "/public/owner-registration/buildings",
      transformResponse: (response: OwnerRegistrationBuildingsResponse) => response.data,
    }),
    getOwnerRegistrationStatus: builder.query<OwnerRegistrationRequest | null, { deviceId?: string; requestToken?: string }>({
      query: ({ deviceId, requestToken }) => {
        const params = new URLSearchParams();
        if (deviceId) params.set("deviceId", deviceId);
        if (requestToken) params.set("requestToken", requestToken);

        return `/public/owner-registration-requests/status?${params.toString()}`;
      },
      transformResponse: (response: ApiEnvelope<OwnerRegistrationRequest>) => response.data,
      providesTags: ["OwnerRegistration"],
    }),
    submitOwnerRegistration: builder.mutation<OwnerRegistrationRequest, FormData>({
      query: (body) => ({
        url: "/public/owner-registration-requests",
        method: "POST",
        body,
      }),
      transformResponse: (response: ApiEnvelope<OwnerRegistrationRequest>) => response.data,
      invalidatesTags: ["OwnerRegistration"],
    }),
    getOwnerRegistrationRequests: builder.query<OwnerRegistrationRequest[], { status?: string; q?: string } | void>({
      query: (input) => {
        const params = new URLSearchParams();
        if (input?.status && input.status !== "all") params.set("status", input.status);
        if (input?.q) params.set("q", input.q);
        params.set("perPage", "50");

        return `/owner-registration-requests?${params.toString()}`;
      },
      transformResponse: (response: PaginatedEnvelope<OwnerRegistrationRequest>) => response.data,
      providesTags: ["OwnerRegistration"],
    }),
  }),
});

export const {
  useGetOwnerRegistrationBuildingsQuery,
  useGetOwnerRegistrationStatusQuery,
  useSubmitOwnerRegistrationMutation,
  useGetOwnerRegistrationRequestsQuery,
} = ownerRegistrationApi;
