"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { applyViolation, markViolationPaid, markViolationWaived } from "@/lib/api";

export async function applyViolationAction(unitId: string, formData: FormData) {
  const ruleId = Number(formData.get("violation_rule_id"));
  const feeRaw = String(formData.get("fee") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  await applyViolation(unitId, {
    violation_rule_id: ruleId,
    fee: feeRaw ? Number(feeRaw) : undefined,
    notes: notes || undefined,
  });

  revalidatePath(`/units/${unitId}`);
  revalidatePath(`/units/${unitId}/violations`);
  redirect(`/units/${unitId}/violations?applied=1`);
}

export async function markViolationPaidAction(unitId: string, violationId: number) {
  await markViolationPaid(violationId);

  revalidatePath(`/units/${unitId}`);
  revalidatePath(`/units/${unitId}/violations`);
  redirect(`/units/${unitId}/violations?paid=1`);
}

export async function markViolationWaivedAction(unitId: string, violationId: number, formData: FormData) {
  const reason = String(formData.get("reason") ?? "").trim();

  await markViolationWaived(violationId, reason);

  revalidatePath(`/units/${unitId}`);
  revalidatePath(`/units/${unitId}/violations`);
  redirect(`/units/${unitId}/violations?waived=1`);
}
