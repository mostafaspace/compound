import { api } from "../api";
import type { ApiEnvelope, ApartmentNote, PaginatedEnvelope } from "./types";

export const notesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    listNotes: builder.query<ApartmentNote[], string>({
      query: (unitId) => `/apartments/${unitId}/notes`,
      transformResponse: (response: PaginatedEnvelope<ApartmentNote>) => response.data,
      providesTags: (_result, _error, unitId) => [{ type: "ApartmentNote", id: unitId }],
    }),
    appendNote: builder.mutation<ApartmentNote, { unitId: string; body: string }>({
      query: ({ unitId, body }) => ({
        url: `/apartments/${unitId}/notes`,
        method: "POST",
        body: { body },
      }),
      transformResponse: (response: ApiEnvelope<ApartmentNote>) => response.data,
      invalidatesTags: (_result, _error, { unitId }) => [
        { type: "ApartmentDetail", id: unitId },
        { type: "ApartmentNote", id: unitId },
      ],
    }),
    updateNote: builder.mutation<ApartmentNote, { unitId: string; noteId: number; body: string }>({
      query: ({ unitId, noteId, body }) => ({
        url: `/apartments/${unitId}/notes/${noteId}`,
        method: "PATCH",
        body: { body },
      }),
      transformResponse: (response: ApiEnvelope<ApartmentNote>) => response.data,
      invalidatesTags: (_result, _error, { unitId }) => [
        { type: "ApartmentDetail", id: unitId },
        { type: "ApartmentNote", id: unitId },
      ],
    }),
    deleteNote: builder.mutation<void, { unitId: string; noteId: number }>({
      query: ({ unitId, noteId }) => ({
        url: `/apartments/${unitId}/notes/${noteId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { unitId }) => [
        { type: "ApartmentDetail", id: unitId },
        { type: "ApartmentNote", id: unitId },
      ],
    }),
  }),
});

export const {
  useListNotesQuery,
  useAppendNoteMutation,
  useUpdateNoteMutation,
  useDeleteNoteMutation,
} = notesApi;
