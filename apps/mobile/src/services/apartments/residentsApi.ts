import { api } from "../api";
import { toFormData } from "./formData";
import type { ApiEnvelope, ApartmentResident, UploadFile } from "./types";

type ResidentInput = {
  user_id?: number | null;
  relation_type?: string;
  is_primary?: boolean;
  verification_status?: string;
  starts_at?: string | null;
  ends_at?: string | null;
  resident_name?: string | null;
  resident_phone?: string | null;
  phone_public?: boolean;
  resident_email?: string | null;
  email_public?: boolean;
  photo?: UploadFile | null;
};

export const residentsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    listResidents: builder.query<ApartmentResident[], string>({
      query: (unitId) => `/apartments/${unitId}/residents`,
      transformResponse: (response: ApiEnvelope<ApartmentResident[]>) => response.data,
      providesTags: (_result, _error, unitId) => [{ type: "ApartmentResident", id: unitId }],
    }),
    createResident: builder.mutation<ApartmentResident, { unitId: string; body: ResidentInput }>({
      query: ({ unitId, body }) => ({
        url: `/apartments/${unitId}/residents`,
        method: "POST",
        body: toFormData(body),
      }),
      transformResponse: (response: ApiEnvelope<ApartmentResident>) => response.data,
      invalidatesTags: (_result, _error, { unitId }) => [
        { type: "ApartmentDetail", id: unitId },
        { type: "ApartmentResident", id: unitId },
      ],
    }),
    updateResident: builder.mutation<ApartmentResident, { unitId: string; residentId: number; body: Partial<ResidentInput> }>({
      query: ({ unitId, residentId, body }) => ({
        url: `/apartments/${unitId}/residents/${residentId}`,
        method: "PATCH",
        body: toFormData(body),
      }),
      transformResponse: (response: ApiEnvelope<ApartmentResident>) => response.data,
      invalidatesTags: (_result, _error, { unitId }) => [
        { type: "ApartmentDetail", id: unitId },
        { type: "ApartmentResident", id: unitId },
      ],
    }),
    deleteResident: builder.mutation<void, { unitId: string; residentId: number }>({
      query: ({ unitId, residentId }) => ({
        url: `/apartments/${unitId}/residents/${residentId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { unitId }) => [
        { type: "ApartmentDetail", id: unitId },
        { type: "ApartmentResident", id: unitId },
      ],
    }),
  }),
});

export const {
  useListResidentsQuery,
  useCreateResidentMutation,
  useUpdateResidentMutation,
  useDeleteResidentMutation,
} = residentsApi;
