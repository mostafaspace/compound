"use server";

import { lookupVehicles, notifyVehicleOwner } from "@/lib/api";
import { normalizeDigits } from "@/lib/numerals";

export async function lookupVehiclesAction(query: string) {
  return await lookupVehicles(normalizeDigits(query));
}

export async function notifyVehicleOwnerAction(
  vehicleId: number | string,
  message: string,
  alias?: string,
) {
  return await notifyVehicleOwner(vehicleId, message, alias);
}
