"use server";

import { revalidatePath } from "next/cache";
import {
  createRole as apiCreateRole,
  deleteRole as apiDeleteRole,
  updateRolePermissions as apiUpdateRolePermissions,
} from "@/lib/api";

export async function createRole(name: string, permissions: string[]) {
  const role = await apiCreateRole(name, permissions);
  revalidatePath("/settings/roles");
  return role;
}

export async function deleteRole(roleId: number) {
  await apiDeleteRole(roleId);
  revalidatePath("/settings/roles");
}

export async function updateRolePermissions(roleId: number, permissions: string[]) {
  const role = await apiUpdateRolePermissions(roleId, permissions);
  revalidatePath("/settings/roles");
  return role;
}
