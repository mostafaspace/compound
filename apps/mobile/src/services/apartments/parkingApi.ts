import { api } from "../api";
import type { ApiEnvelope, ApartmentParkingSpot } from "./types";

type ParkingSpotInput = {
  code?: string;
  notes?: string | null;
};

export const parkingApi = api.injectEndpoints({
  endpoints: (builder) => ({
    listParkingSpots: builder.query<ApartmentParkingSpot[], string>({
      query: (unitId) => `/apartments/${unitId}/parking-spots`,
      transformResponse: (response: ApiEnvelope<ApartmentParkingSpot[]>) => response.data,
      providesTags: (_result, _error, unitId) => [{ type: "ApartmentParkingSpot", id: unitId }],
    }),
    createParkingSpot: builder.mutation<ApartmentParkingSpot, { unitId: string; body: ParkingSpotInput }>({
      query: ({ unitId, body }) => ({
        url: `/apartments/${unitId}/parking-spots`,
        method: "POST",
        body,
      }),
      transformResponse: (response: ApiEnvelope<ApartmentParkingSpot>) => response.data,
      invalidatesTags: (_result, _error, { unitId }) => [
        { type: "ApartmentDetail", id: unitId },
        { type: "ApartmentParkingSpot", id: unitId },
      ],
    }),
    updateParkingSpot: builder.mutation<ApartmentParkingSpot, { unitId: string; parkingSpotId: number; body: Partial<ParkingSpotInput> }>({
      query: ({ unitId, parkingSpotId, body }) => ({
        url: `/apartments/${unitId}/parking-spots/${parkingSpotId}`,
        method: "PATCH",
        body,
      }),
      transformResponse: (response: ApiEnvelope<ApartmentParkingSpot>) => response.data,
      invalidatesTags: (_result, _error, { unitId }) => [
        { type: "ApartmentDetail", id: unitId },
        { type: "ApartmentParkingSpot", id: unitId },
      ],
    }),
    deleteParkingSpot: builder.mutation<void, { unitId: string; parkingSpotId: number }>({
      query: ({ unitId, parkingSpotId }) => ({
        url: `/apartments/${unitId}/parking-spots/${parkingSpotId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { unitId }) => [
        { type: "ApartmentDetail", id: unitId },
        { type: "ApartmentParkingSpot", id: unitId },
      ],
    }),
  }),
});

export const {
  useListParkingSpotsQuery,
  useCreateParkingSpotMutation,
  useUpdateParkingSpotMutation,
  useDeleteParkingSpotMutation,
} = parkingApi;
