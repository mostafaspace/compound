import { api } from "../api";

export type VehicleNotifySearchResult = {
  found: boolean;
  recipientCount: number;
  anonymizedUnitLabel: string | null;
};

export type VehicleNotifyMessage = {
  id: number;
  message: string;
  plate: string;
  senderLabel: string;
  senderMode: "anonymous" | "identified";
  readAt: string | null;
  createdAt: string;
};

export const vehicleNotificationsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    searchVehicle: builder.mutation<VehicleNotifySearchResult, { plate: string }>({
      query: (body) => ({ url: "/vehicle-notifications/search", method: "POST", body }),
      transformResponse: (r: { data: VehicleNotifySearchResult }) => r.data,
    }),
    sendVehicleNotification: builder.mutation<
      { id: number; recipientCount: number },
      { plate: string; message: string; sender_mode: "anonymous" | "identified"; sender_alias?: string }
    >({
      query: (body) => ({ url: "/vehicle-notifications", method: "POST", body }),
      transformResponse: (r: { data: { id: number; recipientCount: number } }) => r.data,
      invalidatesTags: ["VehicleNotification"],
    }),
    listMyVehicleNotifications: builder.query<VehicleNotifyMessage[], void>({
      query: () => "/vehicle-notifications",
      transformResponse: (r: { data: VehicleNotifyMessage[] }) => r.data,
      providesTags: ["VehicleNotification"],
    }),
    markVehicleNotificationRead: builder.mutation<void, number>({
      query: (recipientId) => ({
        url: `/vehicle-notifications/${recipientId}/read`,
        method: "PATCH",
      }),
      invalidatesTags: ["VehicleNotification"],
    }),
  }),
});

export const {
  useSearchVehicleMutation,
  useSendVehicleNotificationMutation,
  useListMyVehicleNotificationsQuery,
  useMarkVehicleNotificationReadMutation,
} = vehicleNotificationsApi;
