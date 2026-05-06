import { api } from "./api";
import type {
  ApiEnvelope,
  CreateIssueInput,
  PaginatedEnvelope,
  UpdateIssueInput,
  UnitMembership,
  VerificationRequest,
  VisitorRequest,
  Issue,
  UserNotification,
  UserDocument,
  DocumentType,
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
    getVisitorRequest: builder.query<VisitorRequest, string>({
      query: (id) => `/visitor-requests/${id}`,
      transformResponse: (response: ApiEnvelope<VisitorRequest>) => response.data,
      providesTags: (_result, _error, id) => [{ type: "VisitorRequest", id }],
    }),
    cancelVisitor: builder.mutation<VisitorRequest, { id: string; reason: string }>({
      query: ({ id, reason }) => ({
        url: `/visitor-requests/${id}/cancel`,
        method: "POST",
        body: { reason },
      }),
      transformResponse: (response: ApiEnvelope<VisitorRequest>) => response.data,
      invalidatesTags: ["VisitorRequest"],
    }),
    markAsShared: builder.mutation<VisitorRequest, string>({
      query: (id) => ({
        url: `/visitor-requests/${id}/mark-as-shared`,
        method: "POST",
      }),
      transformResponse: (response: ApiEnvelope<VisitorRequest>) => response.data,
      invalidatesTags: ["VisitorRequest"],
    }),
    getIssues: builder.query<Issue[], void>({
      query: () => "/my/issues",
      transformResponse: (response: ApiEnvelope<Issue[]>) => response.data,
      providesTags: ["Issue"],
    }),
    getAllIssues: builder.query<Issue[], void>({
      query: () => "/issues?perPage=50",
      transformResponse: (response: PaginatedEnvelope<Issue>) => response.data,
      providesTags: ["Issue"],
    }),
    getIssue: builder.query<Issue, string | number>({
      query: (id) => `/issues/${id}`,
      transformResponse: (response: ApiEnvelope<Issue>) => response.data,
      providesTags: (_result, _error, id) => [{ type: "Issue", id }],
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
    getDocumentTypes: builder.query<DocumentType[], void>({
      query: () => "/document-types",
      transformResponse: (response: ApiEnvelope<DocumentType[]>) => response.data,
    }),
    getDocuments: builder.query<UserDocument[], void>({
      query: () => "/documents",
      transformResponse: (response: PaginatedEnvelope<UserDocument>) => response.data,
      providesTags: ["UserDocument"],
    }),
    createIssue: builder.mutation<Issue, CreateIssueInput>({
      query: (body) => ({
        url: "/issues",
        method: "POST",
        body,
      }),
      transformResponse: (response: ApiEnvelope<Issue>) => response.data,
      invalidatesTags: ["Issue"],
    }),
    uploadIssueAttachment: builder.mutation<any, { issueId: string | number; formData: FormData }>({
      query: ({ issueId, formData }) => ({
        url: `/issues/${issueId}/attachments`,
        method: "POST",
        body: formData,
        // Typically RTK Query needs to NOT set Content-Type header so the browser/fetch sets multipart/form-data boundary
        // We might not need to do anything special here as RTK Query handles FormData automatically,
        // but depending on setup it should work.
      }),
      invalidatesTags: ["Issue"],
    }),
    deleteIssueAttachment: builder.mutation<void, { issueId: string | number; attachmentId: string | number }>({
      query: ({ issueId, attachmentId }) => ({
        url: `/issues/${issueId}/attachments/${attachmentId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Issue"],
    }),
    createVisitor: builder.mutation<VisitorRequest, any>({
      query: (body) => ({
        url: "/visitor-requests",
        method: "POST",
        body,
      }),
      transformResponse: (response: ApiEnvelope<VisitorRequest>) => response.data,
      invalidatesTags: ["VisitorRequest"],
    }),
    uploadDocument: builder.mutation<UserDocument, FormData>({
      query: (body) => ({
        url: "/documents",
        method: "POST",
        body,
      }),
      transformResponse: (response: ApiEnvelope<UserDocument>) => response.data,
      invalidatesTags: ["UserDocument"],
    }),
    updateIssue: builder.mutation<Issue, { id: string | number; body: UpdateIssueInput }>({
      query: ({ id, body }) => ({
        url: `/issues/${id}`,
        method: "PATCH",
        body,
      }),
      transformResponse: (response: ApiEnvelope<Issue>) => response.data,
      invalidatesTags: ["Issue"],
    }),
    escalateIssue: builder.mutation<Issue, { id: string | number; reason: string }>({
      query: ({ id, reason }) => ({
        url: `/issues/${id}/escalate`,
        method: "POST",
        body: { reason },
      }),
      transformResponse: (response: ApiEnvelope<Issue>) => response.data,
      invalidatesTags: ["Issue"],
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
    createAnnouncement: builder.mutation<void, { title: string; content: string; category?: string; mustAcknowledge?: boolean }>({
      query: (body) => ({
        url: "/announcements",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Announcement"],
    }),
  }),
});

export const {
  useGetUnitsQuery,
  useGetVerificationRequestsQuery,
  useGetVisitorRequestsQuery,
  useGetVisitorRequestQuery,
  useCancelVisitorMutation,
  useMarkAsSharedMutation,
  useGetIssuesQuery,
  useGetAllIssuesQuery,
  useGetIssueQuery,
  useGetNotificationsQuery,
  useGetAnnouncementsQuery,
  useAcknowledgeAnnouncementMutation,
  useGetStatusQuery,
  useGetDocumentTypesQuery,
  useGetDocumentsQuery,
  useCreateIssueMutation,
  useUploadIssueAttachmentMutation,
  useCreateVisitorMutation,
  useUploadDocumentMutation,
  useUpdateIssueMutation,
  useEscalateIssueMutation,
  useCreateAnnouncementMutation,
  useMarkNotificationReadMutation,
  useArchiveNotificationMutation,
  useDeleteIssueAttachmentMutation,
} = propertyApi;
