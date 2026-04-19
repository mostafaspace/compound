"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  approveVerificationRequest,
  rejectVerificationRequest,
  requestMoreInfoForVerificationRequest,
  resendResidentInvitation,
  revokeResidentInvitation,
} from "@/lib/api";

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

export async function approveVerificationRequestAction(verificationRequestId: number, formData: FormData) {
  await approveVerificationRequest(verificationRequestId, {
    note: String(formData.get("note") ?? "").trim() || undefined,
  });

  revalidatePath("/onboarding");
  redirect("/onboarding?approved=1");
}

export async function rejectVerificationRequestAction(verificationRequestId: number, formData: FormData) {
  await rejectVerificationRequest(verificationRequestId, {
    note: String(formData.get("note") ?? "").trim(),
  });

  revalidatePath("/onboarding");
  redirect("/onboarding?rejected=1");
}

export async function requestMoreInfoAction(verificationRequestId: number, formData: FormData) {
  await requestMoreInfoForVerificationRequest(verificationRequestId, {
    note: String(formData.get("note") ?? "").trim(),
  });

  revalidatePath("/onboarding");
  redirect("/onboarding?moreInfo=1");
}
