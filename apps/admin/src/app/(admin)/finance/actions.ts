"use server";

import type { LedgerEntryType } from "@compound/contracts";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  approveFinancePayment,
  createFinanceLedgerEntry,
  createFinanceUnitAccount,
  rejectFinancePayment,
  requestFinancePaymentCorrection,
} from "@/lib/api";

export async function createFinanceUnitAccountAction(formData: FormData) {
  const unitId = String(formData.get("unitId") ?? "").trim();
  const currency = String(formData.get("currency") ?? "EGP").trim().toUpperCase();
  const openingBalanceRaw = String(formData.get("openingBalance") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  await createFinanceUnitAccount({
    unitId,
    currency,
    openingBalance: openingBalanceRaw ? Number(openingBalanceRaw) : undefined,
    description: description || undefined,
  });

  revalidatePath("/finance");
  redirect("/finance?accountCreated=1");
}

export async function createFinanceLedgerEntryAction(formData: FormData) {
  const unitAccountId = String(formData.get("unitAccountId") ?? "").trim();
  const type = String(formData.get("type") ?? "charge") as Exclude<LedgerEntryType, "payment">;
  const amount = Number(formData.get("amount") ?? 0);
  const description = String(formData.get("description") ?? "").trim();

  await createFinanceLedgerEntry(unitAccountId, {
    type,
    amount,
    description,
  });

  revalidatePath("/finance");
  redirect("/finance?ledgerCreated=1");
}

export async function approveFinancePaymentAction(paymentSubmissionId: string, formData: FormData) {
  const description = String(formData.get("description") ?? "").trim();

  await approveFinancePayment(paymentSubmissionId, {
    description: description || undefined,
  });

  revalidatePath("/finance");
  redirect("/finance?paymentApproved=1");
}

export async function rejectFinancePaymentAction(paymentSubmissionId: string, formData: FormData) {
  const reason = String(formData.get("reason") ?? "").trim();

  await rejectFinancePayment(paymentSubmissionId, { reason });

  revalidatePath("/finance");
  redirect("/finance?paymentRejected=1");
}

export async function requestCorrectionPaymentAction(paymentSubmissionId: string, formData: FormData) {
  const note = String(formData.get("note") ?? "").trim();

  await requestFinancePaymentCorrection(paymentSubmissionId, { note });

  revalidatePath("/finance");
  redirect("/finance?correctionRequested=1");
}
