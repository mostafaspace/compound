"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { resendResidentInvitation, revokeResidentInvitation } from "@/lib/api";

export async function resendInvitationAction(invitationId: number) {
  await resendResidentInvitation(invitationId);

  revalidatePath("/onboarding");
  redirect("/onboarding?resent=1");
}

export async function revokeInvitationAction(invitationId: number) {
  await revokeResidentInvitation(invitationId);

  revalidatePath("/onboarding");
  redirect("/onboarding?revoked=1");
}
