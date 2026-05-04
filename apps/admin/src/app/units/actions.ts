"use server";

import type { UnitRelation, UserRole } from "@compound/contracts";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createResidentInvitation, endUnitMembership, getUnit, updateUnitMembership } from "@/lib/api";

function nullableFormString(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();

  return value === "" ? null : value;
}

export async function inviteResidentToUnitAction(unitId: string, formData: FormData) {
  const unit = await getUnit(unitId);

  await createResidentInvitation({
    email: String(formData.get("email") ?? ""),
    isPrimary: formData.get("isPrimary") === "on",
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    relationType: String(formData.get("relationType") ?? "resident") as UnitRelation,
    role: String(formData.get("role") ?? "resident") as UserRole,
    startsAt: String(formData.get("startsAt") ?? "") || undefined,
    unitId,
  });

  revalidatePath(`/units/${unitId}`);
  if (unit) {
    revalidatePath(`/buildings/${unit.buildingId}`);
  }

  redirect(`/units/${unitId}?invited=1`);
}

export async function endMembershipAction(unitId: string, membershipId: number) {
  const unit = await getUnit(unitId);

  await endUnitMembership(membershipId);

  revalidatePath(`/units/${unitId}`);
  if (unit) {
    revalidatePath(`/buildings/${unit.buildingId}`);
  }

  redirect(`/units/${unitId}`);
}

export async function updateMembershipProfileAction(unitId: string, membershipId: number, formData: FormData) {
  const unit = await getUnit(unitId);

  await updateUnitMembership(membershipId, {
    residentName: nullableFormString(formData, "residentName"),
    residentPhone: nullableFormString(formData, "residentPhone"),
    phonePublic: formData.get("phonePublic") === "on",
    residentEmail: nullableFormString(formData, "residentEmail"),
    emailPublic: formData.get("emailPublic") === "on",
    hasVehicle: formData.get("hasVehicle") === "on",
    vehiclePlate: nullableFormString(formData, "vehiclePlate"),
    parkingSpotCode: nullableFormString(formData, "parkingSpotCode"),
    garageStickerCode: nullableFormString(formData, "garageStickerCode"),
  });

  revalidatePath(`/units/${unitId}`);
  if (unit) {
    revalidatePath(`/buildings/${unit.buildingId}`);
  }

  redirect(`/units/${unitId}?updated=1`);
}
