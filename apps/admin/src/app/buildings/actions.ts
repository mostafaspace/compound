"use server";

import type { UnitStatus, UnitType } from "@compound/contracts";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  archiveBuilding,
  archiveFloor,
  archiveUnit,
  createFloor,
  createUnit,
  getBuilding,
  getFloor,
  getUnit,
  updateBuilding,
  updateFloor,
  updateUnit,
} from "@/lib/api";

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

export async function updateBuildingAction(buildingId: string, formData: FormData) {
  const building = await getBuilding(buildingId);

  await updateBuilding(buildingId, {
    code: String(formData.get("code") ?? ""),
    name: String(formData.get("name") ?? ""),
    sortOrder: Number(formData.get("sortOrder") ?? 0),
  });

  revalidatePath(`/buildings/${buildingId}`);
  if (building) {
    revalidatePath(`/compounds/${building.compoundId}`);
  }

  redirect(`/buildings/${buildingId}`);
}

export async function archiveBuildingAction(buildingId: string, formData: FormData) {
  const building = await getBuilding(buildingId);

  await archiveBuilding(buildingId, String(formData.get("reason") ?? ""));

  revalidatePath(`/buildings/${buildingId}`);
  if (building) {
    revalidatePath(`/compounds/${building.compoundId}`);
    redirect(`/compounds/${building.compoundId}`);
  }

  redirect(`/buildings/${buildingId}`);
}

export async function updateFloorAction(buildingId: string, floorId: string, formData: FormData) {
  await updateFloor(floorId, {
    label: String(formData.get("label") ?? ""),
    levelNumber: Number(formData.get("levelNumber") ?? 0),
    sortOrder: Number(formData.get("sortOrder") ?? 0),
  });

  revalidatePath(`/buildings/${buildingId}`);
  redirect(`/buildings/${buildingId}`);
}

export async function archiveFloorAction(buildingId: string, floorId: string, formData: FormData) {
  await archiveFloor(floorId, String(formData.get("reason") ?? ""));

  revalidatePath(`/buildings/${buildingId}`);
  redirect(`/buildings/${buildingId}`);
}

export async function updateUnitAction(buildingId: string, unitId: string, formData: FormData) {
  const floorId = String(formData.get("floorId") ?? "");

  await updateUnit(unitId, {
    areaSqm: optionalNumber(formData.get("areaSqm")),
    bedrooms: optionalNumber(formData.get("bedrooms")),
    floorId: floorId === "" ? undefined : floorId,
    status: String(formData.get("status") ?? "active") as UnitStatus,
    type: String(formData.get("type") ?? "apartment") as UnitType,
    unitNumber: String(formData.get("unitNumber") ?? ""),
  });

  revalidatePath(`/buildings/${buildingId}`);
  revalidatePath(`/units/${unitId}`);
  redirect(`/units/${unitId}`);
}

export async function archiveUnitAction(unitId: string, formData: FormData) {
  const unit = await getUnit(unitId);

  await archiveUnit(unitId, String(formData.get("reason") ?? ""));

  revalidatePath(`/units/${unitId}`);
  if (unit) {
    revalidatePath(`/buildings/${unit.buildingId}`);
  }

  redirect(`/units/${unitId}`);
}

export async function loadFloorOrRedirect(floorId: string) {
  const floor = await getFloor(floorId);

  if (!floor) {
    redirect("/compounds");
  }

  return floor;
}
