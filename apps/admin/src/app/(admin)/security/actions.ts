"use server";

import { 
  getAdminSecurityFlags, 
  reviewAdminSecurityFlag, 
  getAdminSessions 
} from "@/lib/api";
import { revalidatePath } from "next/cache";

export async function getAdminSecurityFlagsAction() {
  return await getAdminSecurityFlags();
}

export async function reviewAdminSecurityFlagAction(flagId: number, status: "reviewed" | "dismissed") {
  await reviewAdminSecurityFlag(flagId, status);
  revalidatePath("/security/admin");
}

export async function getAdminSessionsAction(userId: number) {
  return await getAdminSessions(userId);
}
