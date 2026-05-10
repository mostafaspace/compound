"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  approveVerificationRequest,
  approveOwnerRegistrationRequest,
  denyOwnerRegistrationRequest,
  rejectVerificationRequest,
  requestMoreInfoForVerificationRequest,
  resendResidentInvitation,
  revokeResidentInvitation,
} from "@/lib/api";

export async function resendInvitationAction(invitationId: number) {
  let ok = false;
  try {
    await resendResidentInvitation(invitationId);
    ok = true;
  } catch { /* handled below */ }

  revalidatePath("/onboarding");
  redirect(ok ? "/onboarding?resent=1" : "/onboarding?error=resend_failed");
}

export async function revokeInvitationAction(invitationId: number) {
  let ok = false;
  try {
    await revokeResidentInvitation(invitationId);
    ok = true;
  } catch { /* handled below */ }

  revalidatePath("/onboarding");
  redirect(ok ? "/onboarding?revoked=1" : "/onboarding?error=revoke_failed");
}

export async function approveVerificationRequestAction(verificationRequestId: number, formData: FormData) {
  let ok = false;
  try {
    await approveVerificationRequest(verificationRequestId, {
      note: String(formData.get("note") ?? "").trim() || undefined,
    });
    ok = true;
  } catch { /* handled below */ }

  revalidatePath("/onboarding");
  redirect(ok ? "/onboarding?approved=1" : "/onboarding?error=approve_failed");
}

export async function approveOwnerRegistrationRequestAction(requestId: string, formData: FormData) {
  let ok = false;
  try {
    await approveOwnerRegistrationRequest(requestId, {
      createUnitIfMissing: formData.get("createUnitIfMissing") === "on",
      note: String(formData.get("note") ?? "").trim() || undefined,
    });
    ok = true;
  } catch { /* handled below */ }

  revalidatePath("/onboarding");
  redirect(ok ? "/onboarding?ownerApproved=1" : "/onboarding?error=owner_approve_failed");
}

export async function denyOwnerRegistrationRequestAction(requestId: string, formData: FormData) {
  let ok = false;
  try {
    await denyOwnerRegistrationRequest(requestId, {
      reason: String(formData.get("reason") ?? "").trim(),
    });
    ok = true;
  } catch { /* handled below */ }

  revalidatePath("/onboarding");
  redirect(ok ? "/onboarding?ownerDenied=1" : "/onboarding?error=owner_deny_failed");
}

export async function rejectVerificationRequestAction(verificationRequestId: number, formData: FormData) {
  let ok = false;
  try {
    await rejectVerificationRequest(verificationRequestId, {
      note: String(formData.get("note") ?? "").trim(),
    });
    ok = true;
  } catch { /* handled below */ }

  revalidatePath("/onboarding");
  redirect(ok ? "/onboarding?rejected=1" : "/onboarding?error=reject_failed");
}

export async function requestMoreInfoAction(verificationRequestId: number, formData: FormData) {
  let ok = false;
  try {
    await requestMoreInfoForVerificationRequest(verificationRequestId, {
      note: String(formData.get("note") ?? "").trim(),
    });
    ok = true;
  } catch { /* handled below */ }

  revalidatePath("/onboarding");
  redirect(ok ? "/onboarding?moreInfo=1" : "/onboarding?error=more_info_failed");
}
