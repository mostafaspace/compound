"use server";

import { revalidatePath } from "next/cache";

import { reviewAdminSecurityFlag } from "@/lib/api";

export async function reviewFlagAction(flagId: number, status: "reviewed" | "dismissed") {
  await reviewAdminSecurityFlag(flagId, status);
  revalidatePath("/security/admin-activity");
}
