"use server";

import type { UnitRelation, UserRole } from "@compound/contracts";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createResidentInvitation, endUnitMembership, getUnit } from "@/lib/api";

export async function inviteResidentToUnitAction(unitId: string, formData: FormData) {
  const unit = await getUnit(unitId);

  await createResidentInvitation({
    email: String(formData.get("email") ?? ""),
    isPrimary: formData.get("isPrimary") === "on",
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    relationType: String(formData.get("relationType") ?? "resident") as UnitRelation,
    role: String(formData.get("role") ?? "resident_owner") as UserRole,
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
