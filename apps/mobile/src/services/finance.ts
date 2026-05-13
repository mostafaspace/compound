import { api } from "./api";
import type { 
  ApiEnvelope, 
  UnitAccount,
} from "@compound/contracts";

export const financeApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getUnitAccounts: builder.query<UnitAccount[], void>({
      query: () => "/my/finance/unit-accounts",
      transformResponse: (response: ApiEnvelope<UnitAccount[]>) => response.data,
      providesTags: ["UnitAccount"],
    }),
    getAccountDetail: builder.query<UnitAccount, string>({
      query: (id) => `/my/finance/unit-accounts/${id}`,
      transformResponse: (response: ApiEnvelope<UnitAccount>) => response.data,
      providesTags: (result, error, id) => [{ type: "UnitAccount", id }],
    }),
    submitPayment: builder.mutation<void, { accountId: string; body: FormData; unitId?: string }>({
      query: ({ accountId, body }) => ({
        url: `/finance/unit-accounts/${accountId}/payment-submissions`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { accountId, unitId }) => [
        { type: "UnitAccount", id: accountId },
        ...(unitId ? [{ type: "ApartmentDetail" as const, id: unitId }] : [{ type: "ApartmentDetail" as const }]),
      ],
    }),
  }),
});

export const { 
  useGetUnitAccountsQuery, 
  useGetAccountDetailQuery, 
  useSubmitPaymentMutation,
} = financeApi;
