import { api } from "../api";
import type { ApiEnvelope, ApartmentDetail, ApartmentSummary } from "./types";

export const apartmentsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    listApartments: builder.query<ApartmentSummary[], void>({
      query: () => "/apartments",
      transformResponse: (response: ApiEnvelope<ApartmentSummary[]>) => response.data,
      providesTags: ["Apartment"],
    }),
    getApartment: builder.query<ApartmentDetail, string>({
      query: (id) => `/apartments/${id}`,
      transformResponse: (response: ApiEnvelope<ApartmentDetail>) => response.data,
      providesTags: (_result, _error, id) => [{ type: "ApartmentDetail", id }],
    }),
    getAdminApartment: builder.query<ApartmentDetail, string>({
      query: (id) => `/admin/apartments/${id}`,
      transformResponse: (response: ApiEnvelope<ApartmentDetail>) => response.data,
      providesTags: (_result, _error, id) => [{ type: "ApartmentDetail", id }],
    }),
  }),
});

export const { useListApartmentsQuery, useGetApartmentQuery, useGetAdminApartmentQuery } = apartmentsApi;
