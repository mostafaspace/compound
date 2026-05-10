"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  archiveViolationRule,
  createViolationRule,
  getCurrentUser,
  updateViolationRule,
  type ViolationRuleInput,
} from "@/lib/api";
import { getCompoundContext, requireAdminUser } from "@/lib/session";

async function activeCompoundId(): Promise<string> {
  const user = await requireAdminUser(getCurrentUser);
  const compoundId = (await getCompoundContext()) ?? user.compoundId;

  if (!compoundId) {
    redirect("/violation-rules?error=compound");
  }

  return compoundId;
}

function inputFromForm(formData: FormData): ViolationRuleInput {
  const name = String(formData.get("name") ?? "").trim();
  const nameAr = String(formData.get("name_ar") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const defaultFeeRaw = String(formData.get("default_fee") ?? "").trim();

  return {
    name,
    name_ar: nameAr || null,
    description: description || null,
    default_fee: defaultFeeRaw ? Number(defaultFeeRaw) : null,
    is_active: formData.get("is_active") === "on",
  };
}

export async function createViolationRuleAction(formData: FormData) {
  const compoundId = await activeCompoundId();

  await createViolationRule(compoundId, inputFromForm(formData));

  revalidatePath("/violation-rules");
  redirect("/violation-rules?created=1");
}

export async function updateViolationRuleAction(ruleId: number, formData: FormData) {
  const compoundId = await activeCompoundId();

  await updateViolationRule(compoundId, ruleId, inputFromForm(formData));

  revalidatePath("/violation-rules");
  revalidatePath(`/violation-rules/${ruleId}/edit`);
  redirect("/violation-rules?updated=1");
}

export async function archiveViolationRuleAction(ruleId: number) {
  const compoundId = await activeCompoundId();

  await archiveViolationRule(compoundId, ruleId);

  revalidatePath("/violation-rules");
  redirect("/violation-rules?archived=1");
}
