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
  try {
    await resendResidentInvitation(invitationId);

    revalidatePath("/onboarding");
    redirect("/onboarding?resent=1");
  } catch {
    redirect("/onboarding?error=resend_failed");
  }
}

export async function revokeInvitationAction(invitationId: number) {
  try {
    await revokeResidentInvitation(invitationId);

    revalidatePath("/onboarding");
    redirect("/onboarding?revoked=1");
  } catch {
    redirect("/onboarding?error=revoke_failed");
  }
}

export async function approveVerificationRequestAction(verificationRequestId: number, formData: FormData) {
  try {
    await approveVerificationRequest(verificationRequestId, {
      note: String(formData.get("note") ?? "").trim() || undefined,
    });

    revalidatePath("/onboarding");
    redirect("/onboarding?approved=1");
  } catch {
    redirect("/onboarding?error=approve_failed");
  }
}

export async function rejectVerificationRequestAction(verificationRequestId: number, formData: FormData) {
  try {
    await rejectVerificationRequest(verificationRequestId, {
      note: String(formData.get("note") ?? "").trim(),
    });

    revalidatePath("/onboarding");
    redirect("/onboarding?rejected=1");
  } catch {
    redirect("/onboarding?error=reject_failed");
  }
}

export async function requestMoreInfoAction(verificationRequestId: number, formData: FormData) {
  try {
    await requestMoreInfoForVerificationRequest(verificationRequestId, {
      note: String(formData.get("note") ?? "").trim(),
    });

    revalidatePath("/onboarding");
    redirect("/onboarding?moreInfo=1");
  } catch {
    redirect("/onboarding?error=more_info_failed");
  }
}
