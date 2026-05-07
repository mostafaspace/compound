import { api } from "../api";
import { toFormData } from "./formData";
import type { ApiEnvelope, ApartmentDocument, UploadFile } from "./types";

type DocumentInput = {
  document_type: string;
  file: UploadFile;
};

export const documentsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    listApartmentDocuments: builder.query<ApartmentDocument[], string>({
      query: (unitId) => `/apartments/${unitId}/documents`,
      transformResponse: (response: ApiEnvelope<ApartmentDocument[]>) => response.data,
      providesTags: (_result, _error, unitId) => [{ type: "ApartmentDocument", id: unitId }],
    }),
    uploadApartmentDocument: builder.mutation<ApartmentDocument, { unitId: string; body: DocumentInput }>({
      query: ({ unitId, body }) => ({
        url: `/apartments/${unitId}/documents`,
        method: "POST",
        body: toFormData(body),
      }),
      transformResponse: (response: ApiEnvelope<ApartmentDocument>) => response.data,
      invalidatesTags: (_result, _error, { unitId }) => [
        { type: "ApartmentDetail", id: unitId },
        { type: "ApartmentDocument", id: unitId },
      ],
    }),
    replaceApartmentDocument: builder.mutation<
      { versionId: number; status: string },
      { unitId: string; documentId: number; file: UploadFile }
    >({
      query: ({ unitId, documentId, file }) => ({
        url: `/apartments/${unitId}/documents/${documentId}/replace`,
        method: "POST",
        body: toFormData({ file }),
      }),
      transformResponse: (response: ApiEnvelope<{ versionId: number; status: string }>) => response.data,
      invalidatesTags: (_result, _error, { unitId }) => [
        { type: "ApartmentDetail", id: unitId },
        { type: "ApartmentDocument", id: unitId },
      ],
    }),
  }),
});

export const {
  useListApartmentDocumentsQuery,
  useUploadApartmentDocumentMutation,
  useReplaceApartmentDocumentMutation,
} = documentsApi;
