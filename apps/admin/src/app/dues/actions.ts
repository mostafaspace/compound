"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createChargeType,
  updateChargeType,
  createRecurringCharge,
  deactivateRecurringCharge,
  createCollectionCampaign,
  publishCollectionCampaign,
  archiveCollectionCampaign,
  applyCollectionCampaignCharges,
} from "@/lib/api";

export async function createChargeTypeAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const defaultAmountRaw = String(formData.get("default_amount") ?? "").trim();
  const isRecurring = formData.get("is_recurring") === "on";

  await createChargeType({
    name,
    code,
    defaultAmount: defaultAmountRaw ? defaultAmountRaw : null,
    isRecurring,
  });

  revalidatePath("/dues");
  redirect("/dues?chargeTypeCreated=1");
}

export async function updateChargeTypeAction(id: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const defaultAmountRaw = String(formData.get("default_amount") ?? "").trim();
  const isRecurring = formData.get("is_recurring") === "on";

  await updateChargeType(id, {
    name,
    code,
    defaultAmount: defaultAmountRaw ? defaultAmountRaw : null,
    isRecurring,
  });

  revalidatePath("/dues");
  redirect("/dues?chargeTypeCreated=1");
}

export async function createRecurringChargeAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const amount = String(formData.get("amount") ?? "").trim();
  const currency = String(formData.get("currency") ?? "EGP").trim().toUpperCase();
  const frequency = String(formData.get("frequency") ?? "monthly").trim();
  const billingDayRaw = String(formData.get("billing_day") ?? "").trim();
  const targetType = String(formData.get("target_type") ?? "all").trim();
  const compoundId = String(formData.get("compound_id") ?? "").trim();
  const startsAt = String(formData.get("starts_at") ?? "").trim();

  await createRecurringCharge({
    name,
    amount,
    currency,
    frequency,
    billingDay: billingDayRaw ? Number(billingDayRaw) : undefined,
    targetType,
    compoundId: compoundId || undefined,
    startsAt: startsAt || undefined,
  });

  revalidatePath("/dues");
  redirect("/dues?recurringChargeCreated=1");
}

export async function deactivateRecurringChargeAction(id: string) {
  await deactivateRecurringCharge(id);

  revalidatePath("/dues");
  redirect("/dues?recurringChargeDeactivated=1");
}

export async function createCampaignAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const targetAmountRaw = String(formData.get("target_amount") ?? "").trim();
  const compoundId = String(formData.get("compound_id") ?? "").trim();

  await createCollectionCampaign({
    name,
    description: description || undefined,
    targetAmount: targetAmountRaw ? Number(targetAmountRaw) : undefined,
    compoundId: compoundId || undefined,
  });

  revalidatePath("/dues");
  redirect("/dues?campaignCreated=1");
}

export async function publishCampaignAction(id: string) {
  await publishCollectionCampaign(id);

  revalidatePath("/dues");
  redirect("/dues?campaignPublished=1");
}

export async function archiveCampaignAction(id: string) {
  await archiveCollectionCampaign(id);

  revalidatePath("/dues");
  redirect("/dues?campaignArchived=1");
}

export async function applyCampaignChargesAction(id: string, formData: FormData) {
  const unitAccountIdsRaw = String(formData.get("unit_account_ids") ?? "").trim();
  const amount = Number(formData.get("amount") ?? 0);
  const description = String(formData.get("description") ?? "").trim();

  const unitAccountIds = unitAccountIdsRaw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  await applyCollectionCampaignCharges(id, {
    unitAccountIds,
    amount,
    description,
  });

  revalidatePath("/dues");
  redirect(`/dues/collection-campaigns/${id}/charges?success=1`);
}
