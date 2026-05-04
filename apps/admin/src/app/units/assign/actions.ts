"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createUnitMembership, getUnit } from "@/lib/api";

export async function assignUserToUnitAction(formData: FormData) {
  const unitId = String(formData.get("unitId") ?? "");
  const userId = Number(formData.get("userId") ?? 0);

  if (!unitId || !Number.isFinite(userId) || userId <= 0) {
    redirect("/units/assign?error=missing-selection");
  }

  await createUnitMembership(unitId, {
    userId,
    relationType: "resident",
    isPrimary: true,
    startsAt: new Date().toISOString().slice(0, 10),
    verificationStatus: "verified",
  });

  const unit = await getUnit(unitId);

  revalidatePath("/units/assign");
  revalidatePath(`/units/${unitId}`);
  if (unit) {
    revalidatePath(`/buildings/${unit.buildingId}`);
  }

  redirect("/units/assign?assigned=1");
}
