import { api } from "../api";
import type { ApiEnvelope, ApartmentVehicle } from "./types";

type VehicleInput = {
  apartment_resident_id?: number | null;
  plate?: string;
  make?: string | null;
  model?: string | null;
  color?: string | null;
  sticker_code?: string | null;
  notes?: string | null;
};

export const vehiclesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    listVehicles: builder.query<ApartmentVehicle[], string>({
      query: (unitId) => `/apartments/${unitId}/vehicles`,
      transformResponse: (response: ApiEnvelope<ApartmentVehicle[]>) => response.data,
      providesTags: (_result, _error, unitId) => [{ type: "ApartmentVehicle", id: unitId }],
    }),
    createVehicle: builder.mutation<ApartmentVehicle, { unitId: string; body: VehicleInput }>({
      query: ({ unitId, body }) => ({
        url: `/apartments/${unitId}/vehicles`,
        method: "POST",
        body,
      }),
      transformResponse: (response: ApiEnvelope<ApartmentVehicle>) => response.data,
      invalidatesTags: (_result, _error, { unitId }) => [
        { type: "ApartmentDetail", id: unitId },
        { type: "ApartmentVehicle", id: unitId },
      ],
    }),
    updateVehicle: builder.mutation<ApartmentVehicle, { unitId: string; vehicleId: number; body: Partial<VehicleInput> }>({
      query: ({ unitId, vehicleId, body }) => ({
        url: `/apartments/${unitId}/vehicles/${vehicleId}`,
        method: "PATCH",
        body,
      }),
      transformResponse: (response: ApiEnvelope<ApartmentVehicle>) => response.data,
      invalidatesTags: (_result, _error, { unitId }) => [
        { type: "ApartmentDetail", id: unitId },
        { type: "ApartmentVehicle", id: unitId },
      ],
    }),
    deleteVehicle: builder.mutation<void, { unitId: string; vehicleId: number }>({
      query: ({ unitId, vehicleId }) => ({
        url: `/apartments/${unitId}/vehicles/${vehicleId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { unitId }) => [
        { type: "ApartmentDetail", id: unitId },
        { type: "ApartmentVehicle", id: unitId },
      ],
    }),
  }),
});

export const {
  useListVehiclesQuery,
  useCreateVehicleMutation,
  useUpdateVehicleMutation,
  useDeleteVehicleMutation,
} = vehiclesApi;
