"use server";

import { revalidatePath } from "next/cache";
import {
  getUserRoleAssignments as apiGetUserRoleAssignments,
  assignUserRole as apiAssignUserRole,
  revokeUserRole as apiRevokeUserRole,
  getRoles as apiGetRoles,
} from "@/lib/api";

export async function getUserRoleAssignments(userId: number) {
  return await apiGetUserRoleAssignments(userId);
}

export async function getRoles() {
  return await apiGetRoles();
}

export async function assignUserRole(
  userId: number,
  roleName: string,
  scopeType: string,
  scopeId: string | null
) {
  const result = await apiAssignUserRole(userId, roleName, scopeType, scopeId);
  revalidatePath("/support/users");
  return result;
}

export async function revokeUserRole(userId: number, assignmentId: number) {
  await apiRevokeUserRole(userId, assignmentId);
  revalidatePath("/support/users");
}
