import { api } from "./api";
import type { 
  ApiEnvelope, 
  PaginatedEnvelope,
  VisitorPassValidationResult,
  VisitorRequest,
} from "@compound/contracts";

export const securityApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getPendingVisitorRequests: builder.query<VisitorRequest[], void>({
      query: () => "/visitor-requests?status=pending,qr_issued,arrived,allowed",
      transformResponse: (response: PaginatedEnvelope<VisitorRequest>) => response.data,
      providesTags: ["VisitorRequest"],
    }),
    validatePass: builder.mutation<VisitorPassValidationResult, string>({
      query: (token) => ({
        url: "/visitor-requests/validate-pass",
        method: "POST",
        body: { token },
      }),
      transformResponse: (response: ApiEnvelope<VisitorPassValidationResult>) => response.data,
    }),
    performVisitorAction: builder.mutation<VisitorRequest, { id: string; action: string }>({
      query: ({ id, action }) => ({
        url: `/visitor-requests/${id}/${action}`,
        method: "POST",
      }),
      transformResponse: (response: ApiEnvelope<VisitorRequest>) => response.data,
      invalidatesTags: ["VisitorRequest"],
    }),
  }),
});

export const { 
  useGetPendingVisitorRequestsQuery, 
  useValidatePassMutation, 
  usePerformVisitorActionMutation,
} = securityApi;
