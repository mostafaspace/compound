"use server";

import { revalidatePath } from "next/cache";

import { config } from "@/lib/config";
import { getAuthToken, getCompoundContext } from "@/lib/session";

async function onlinePaymentHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  const compoundId = await getCompoundContext();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (compoundId) headers["X-Compound-Id"] = compoundId;
  return headers;
}

export async function refundTransactionAction(transactionId: string, formData: FormData) {
  const headers = await onlinePaymentHeaders();
  const amount = formData.get("amount");

  await fetch(`${config.apiBaseUrl}/finance/gateway-transactions/${transactionId}/refund`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      amount: amount ? Number(amount) : undefined,
    }),
  });

  revalidatePath("/finance/payments/online");
}
