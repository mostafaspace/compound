"use server";

import type { UnitStatus, UnitType } from "@compound/contracts";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createFloor, createUnit, getBuilding } from "@/lib/api";

function optionalNumber(value: FormDataEntryValue | null): number | undefined {
  if (value === null || String(value).trim() === "") {
    return undefined;
  }

  return Number(value);
}

export async function createFloorAction(buildingId: string, formData: FormData) {
  await createFloor(buildingId, {
    label: String(formData.get("label") ?? ""),
    levelNumber: Number(formData.get("levelNumber") ?? 0),
    sortOrder: Number(formData.get("sortOrder") ?? 0),
  });

  revalidatePath(`/buildings/${buildingId}`);
  redirect(`/buildings/${buildingId}`);
}

export async function createUnitAction(buildingId: string, formData: FormData) {
  const building = await getBuilding(buildingId);
  const floorId = String(formData.get("floorId") ?? "");

  await createUnit(buildingId, {
    areaSqm: optionalNumber(formData.get("areaSqm")),
    bedrooms: optionalNumber(formData.get("bedrooms")),
    floorId: floorId === "" ? undefined : floorId,
    status: String(formData.get("status") ?? "active") as UnitStatus,
    type: String(formData.get("type") ?? "apartment") as UnitType,
    unitNumber: String(formData.get("unitNumber") ?? ""),
  });

  revalidatePath(`/buildings/${buildingId}`);
  if (building) {
    revalidatePath(`/compounds/${building.compoundId}`);
  }

  redirect(`/buildings/${buildingId}`);
}
