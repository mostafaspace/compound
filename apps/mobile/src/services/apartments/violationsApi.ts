import { api } from "../api";
import type { ApartmentViolation, PaginatedEnvelope } from "./types";

export const violationsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    listViolations: builder.query<ApartmentViolation[], string>({
      query: (unitId) => `/apartments/${unitId}/violations`,
      transformResponse: (response: PaginatedEnvelope<ApartmentViolation>) => response.data,
      providesTags: (_result, _error, unitId) => [{ type: "ApartmentViolation", id: unitId }],
    }),
  }),
});

export const { useListViolationsQuery } = violationsApi;
