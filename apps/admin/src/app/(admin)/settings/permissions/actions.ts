"use server";

import { revalidatePath } from "next/cache";
import {
  createPermission as apiCreatePermission,
  deletePermission as apiDeletePermission,
} from "@/lib/api";

export async function createPermission(name: string) {
  const perm = await apiCreatePermission(name);
  revalidatePath("/settings/permissions");
  return perm;
}

export async function deletePermission(id: number) {
  await apiDeletePermission(id);
  revalidatePath("/settings/permissions");
}
