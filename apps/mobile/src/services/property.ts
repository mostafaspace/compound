import { api } from "./api";
import type { 
  ApiEnvelope, 
  PaginatedEnvelope, 
  UnitMembership, 
  VerificationRequest, 
  VisitorRequest,
  Issue,
  UserNotification,
} from "@compound/contracts";

export const propertyApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getUnits: builder.query<UnitMembership[], void>({
      query: () => "/my/units?perPage=20",
      transformResponse: (response: PaginatedEnvelope<UnitMembership>) => response.data,
      providesTags: ["UnitMembership"],
    }),
    getVerificationRequests: builder.query<VerificationRequest[], void>({
      query: () => "/my/verification-requests",
      transformResponse: (response: ApiEnvelope<VerificationRequest[]>) => response.data,
      providesTags: ["VerificationRequest"],
    }),
    getVisitorRequests: builder.query<VisitorRequest[], void>({
      query: () => "/visitor-requests",
      transformResponse: (response: PaginatedEnvelope<VisitorRequest>) => response.data,
      providesTags: ["VisitorRequest"],
    }),
    cancelVisitor: builder.mutation<VisitorRequest, { id: string; reason: string }>({
      query: ({ id, reason }) => ({
        url: `/visitor-requests/${id}/cancel`,
        method: "POST",
        body: { reason },
      }),
      invalidatesTags: ["VisitorRequest"],
    }),
    getIssues: builder.query<Issue[], void>({
      query: () => "/my/issues",
      transformResponse: (response: ApiEnvelope<Issue[]>) => response.data,
      providesTags: ["Issue"],
    }),
    getNotifications: builder.query<UserNotification[], void>({
      query: () => "/notifications?perPage=20",
      transformResponse: (response: PaginatedEnvelope<UserNotification>) => response.data,
      providesTags: ["Notification"],
    }),
    getAnnouncements: builder.query<any[], void>({
      query: () => "/my/announcements?perPage=20",
      transformResponse: (response: PaginatedEnvelope<any>) => response.data,
      providesTags: ["Announcement"],
    }),
    acknowledgeAnnouncement: builder.mutation<void, string | number>({
      query: (id) => ({
        url: `/announcements/${id}/acknowledge`,
        method: "POST",
      }),
      invalidatesTags: ["Announcement"],
    }),
    getStatus: builder.query<any, void>({
      query: () => "/status",
    }),
    getDocumentTypes: builder.query<any[], void>({
      query: () => "/document-types",
      transformResponse: (response: ApiEnvelope<any[]>) => response.data,
    }),
    createIssue: builder.mutation<Issue, any>({
      query: (body) => ({
        url: "/issues",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Issue"],
    }),
    createVisitor: builder.mutation<VisitorRequest, any>({
      query: (body) => ({
        url: "/visitor-requests",
        method: "POST",
        body,
      }),
      invalidatesTags: ["VisitorRequest"],
    }),
    uploadDocument: builder.mutation<any, FormData>({
      query: (body) => ({
        url: "/documents",
        method: "POST",
        body,
      }),
      invalidatesTags: ["VerificationRequest"],
    }),
    markNotificationRead: builder.mutation<void, string | number>({
      query: (id) => ({
        url: `/notifications/${id}/read`,
        method: "POST",
      }),
      invalidatesTags: ["Notification"],
    }),
    archiveNotification: builder.mutation<void, string | number>({
      query: (id) => ({
        url: `/notifications/${id}/archive`,
        method: "POST",
      }),
      invalidatesTags: ["Notification"],
    }),
  }),
});

export const { 
  useGetUnitsQuery, 
  useGetVerificationRequestsQuery, 
  useGetVisitorRequestsQuery,
  useCancelVisitorMutation,
  useGetIssuesQuery,
  useGetNotificationsQuery,
  useGetAnnouncementsQuery,
  useAcknowledgeAnnouncementMutation,
  useGetStatusQuery,
  useGetDocumentTypesQuery,
  useCreateIssueMutation,
  useCreateVisitorMutation,
  useUploadDocumentMutation,
  useMarkNotificationReadMutation,
  useArchiveNotificationMutation,
} = propertyApi;
