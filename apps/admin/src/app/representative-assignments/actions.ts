"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCompounds } from "@/lib/api";
import {
  createRepresentativeAssignment,
  expireRepresentativeAssignment,
} from "@/lib/orgchart";
import type { RepresentativeRole } from "@/lib/orgchart";

export async function createRepresentativeAssignmentAction(formData: FormData) {
  const compoundId = String(formData.get("compound_id") ?? "").trim();
  const userIdRaw = String(formData.get("user_id") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim() as RepresentativeRole;
  const buildingId = String(formData.get("building_id") ?? "").trim();
  const floorId = String(formData.get("floor_id") ?? "").trim();
  const startsAt = String(formData.get("starts_at") ?? "").trim();
  const endsAt = String(formData.get("ends_at") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!compoundId) {
    // Fall back to first compound
    const compounds = await getCompounds();
    if (compounds.length === 0) {
      throw new Error("No compounds found.");
    }
    const firstCompoundId = compounds[0].id;
    await createRepresentativeAssignment(firstCompoundId, {
      userId: Number(userIdRaw),
      role,
      buildingId: buildingId || undefined,
      floorId: floorId || undefined,
      startsAt: startsAt || new Date().toISOString().split("T")[0],
      notes: notes || undefined,
    });
  } else {
    await createRepresentativeAssignment(compoundId, {
      userId: Number(userIdRaw),
      role,
      buildingId: buildingId || undefined,
      floorId: floorId || undefined,
      startsAt: startsAt || new Date().toISOString().split("T")[0],
      notes: notes || undefined,
    });
  }

  revalidatePath("/representative-assignments");
  redirect("/representative-assignments?created=1");
}

export async function deactivateRepresentativeAssignmentAction(id: string) {
  await expireRepresentativeAssignment(id);

  revalidatePath("/representative-assignments");
  redirect("/representative-assignments?deactivated=1");
}
