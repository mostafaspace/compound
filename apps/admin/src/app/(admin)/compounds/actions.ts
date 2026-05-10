"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { archiveCompound, createBuilding, createCompound, updateCompound } from "@/lib/api";
import { setCompoundContext } from "@/lib/session";

/**
 * Set the active compound context cookie and revalidate all pages so they
 * re-fetch data scoped to the new compound. Passing null clears the context
 * (super-admin goes back to "all compounds" view).
 */
export async function switchCompoundAction(compoundId: string | null): Promise<void> {
  await setCompoundContext(compoundId);
  revalidatePath("/", "layout");
}

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

export async function updateCompoundAction(compoundId: string, formData: FormData) {
  await updateCompound(compoundId, {
    code: String(formData.get("code") ?? ""),
    currency: String(formData.get("currency") ?? "EGP"),
    legalName: String(formData.get("legalName") ?? ""),
    name: String(formData.get("name") ?? ""),
    status: String(formData.get("status") ?? "draft") as "draft" | "active" | "suspended" | "archived",
    timezone: String(formData.get("timezone") ?? "Africa/Cairo"),
  });

  revalidatePath("/compounds");
  revalidatePath(`/compounds/${compoundId}`);
  redirect(`/compounds/${compoundId}`);
}

export async function archiveCompoundAction(compoundId: string, formData: FormData) {
  await archiveCompound(compoundId, String(formData.get("reason") ?? ""));

  revalidatePath("/compounds");
  revalidatePath(`/compounds/${compoundId}`);
  redirect(`/compounds/${compoundId}`);
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
