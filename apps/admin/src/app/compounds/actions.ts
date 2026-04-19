"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createBuilding, createCompound } from "@/lib/api";

export async function createCompoundAction(formData: FormData) {
  await createCompound({
    name: String(formData.get("name") ?? ""),
    legalName: String(formData.get("legalName") ?? ""),
    code: String(formData.get("code") ?? ""),
    timezone: String(formData.get("timezone") ?? "Africa/Cairo"),
    currency: String(formData.get("currency") ?? "EGP"),
  });

  revalidatePath("/compounds");
  redirect("/compounds");
}

export async function createBuildingAction(compoundId: string, formData: FormData) {
  await createBuilding(compoundId, {
    code: String(formData.get("code") ?? ""),
    name: String(formData.get("name") ?? ""),
    sortOrder: Number(formData.get("sortOrder") ?? 0),
  });

  revalidatePath(`/compounds/${compoundId}`);
  redirect(`/compounds/${compoundId}`);
}
