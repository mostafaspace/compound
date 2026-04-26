import { api } from "./api";
import type { 
  ApiEnvelope, 
  PaginatedEnvelope,
  VisitorRequest,
} from "@compound/contracts";

export const securityApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getPendingVisitorRequests: builder.query<VisitorRequest[], void>({
      query: () => "/visitor-requests?status=pending",
      transformResponse: (response: PaginatedEnvelope<VisitorRequest>) => response.data,
      providesTags: ["VisitorRequest"],
    }),
    validatePass: builder.mutation<{ result: string; visitorRequest: VisitorRequest | null }, string>({
      query: (token) => ({
        url: "/visitor-requests/validate-pass",
        method: "POST",
        body: { token },
      }),
    }),
    performVisitorAction: builder.mutation<VisitorRequest, { id: string; action: string }>({
      query: ({ id, action }) => ({
        url: `/visitor-requests/${id}/${action}`,
        method: "POST",
      }),
      invalidatesTags: ["VisitorRequest"],
    }),
  }),
});

export const { 
  useGetPendingVisitorRequestsQuery, 
  useValidatePassMutation, 
  usePerformVisitorActionMutation,
} = securityApi;
