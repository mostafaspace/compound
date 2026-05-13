"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { config } from "@/lib/config";
import { getAuthToken, getCompoundContext } from "@/lib/session";

async function supportHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  const compoundId = await getCompoundContext();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (token) headers.Authorization = `Bearer ${token}`;
  if (compoundId) headers["X-Compound-Id"] = compoundId;

  return headers;
}

export async function suspendUserAction(userId: number, formData: FormData) {
  const headers = await supportHeaders();
  const reason = String(formData.get("reason") ?? "").trim();

  const response = await fetch(`${config.apiBaseUrl}/users/${userId}/suspend`, {
    method: "POST",
    headers,
    body: JSON.stringify({ reason }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? `Failed to suspend user: ${response.status}`);
  }

  revalidatePath(`/support/users/${userId}`);
  redirect(`/support/users/${userId}?updated=suspended`);
}

export async function reactivateUserAction(userId: number, formData: FormData) {
  const headers = await supportHeaders();
  const reason = String(formData.get("reason") ?? "").trim() || null;

  const response = await fetch(`${config.apiBaseUrl}/users/${userId}/reactivate`, {
    method: "POST",
    headers,
    body: JSON.stringify({ reason }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? `Failed to reactivate user: ${response.status}`);
  }

  revalidatePath(`/support/users/${userId}`);
  redirect(`/support/users/${userId}?updated=reactivated`);
}

export async function moveOutUserAction(userId: number, formData: FormData) {
  const headers = await supportHeaders();

  const response = await fetch(`${config.apiBaseUrl}/users/${userId}/move-out`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      reason: String(formData.get("reason") ?? "").trim(),
      effective_date: String(formData.get("effective_date") ?? "").trim() || undefined,
      archive_account: formData.get("archive_account") === "true",
    }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? `Failed to process move-out: ${response.status}`);
  }

  revalidatePath(`/support/users/${userId}`);
  redirect(`/support/users/${userId}?updated=moved-out`);
}

export async function recoverUserAction(userId: number, formData: FormData) {
  const headers = await supportHeaders();
  const name = String(formData.get("name") ?? "").trim() || undefined;
  const email = String(formData.get("email") ?? "").trim() || undefined;
  const phone = String(formData.get("phone") ?? "").trim() || undefined;

  const response = await fetch(`${config.apiBaseUrl}/users/${userId}/recover`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      reason: String(formData.get("reason") ?? "").trim(),
      name,
      email,
      phone,
    }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? `Failed to recover user: ${response.status}`);
  }

  revalidatePath(`/support/users/${userId}`);
  redirect(`/support/users/${userId}?updated=recovered`);
}

export async function initiateMergeAction(formData: FormData) {
  const headers = await supportHeaders();
  const sourceUserId = Number(formData.get("source_user_id"));
  const targetUserId = Number(formData.get("target_user_id"));

  if (!Number.isInteger(sourceUserId) || !Number.isInteger(targetUserId) || targetUserId <= 0) {
    throw new Error("Choose a merge target before submitting.");
  }

  const response = await fetch(`${config.apiBaseUrl}/account-merges`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      source_user_id: sourceUserId,
      target_user_id: targetUserId,
      notes: String(formData.get("notes") ?? "").trim() || null,
    }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? `Failed to initiate merge: ${response.status}`);
  }

  const merge = (await response.json()) as { id: number };

  revalidatePath("/support/users");
  redirect(`/support/merges/${merge.id}?created=1`);
}

export async function confirmMergeAction(mergeId: number) {
  const headers = await supportHeaders();

  const response = await fetch(`${config.apiBaseUrl}/account-merges/${mergeId}/confirm`, {
    method: "POST",
    headers,
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? `Failed to confirm merge: ${response.status}`);
  }

  revalidatePath("/support/users");
  redirect(`/support/merges/${mergeId}?updated=completed`);
}

export async function cancelMergeAction(mergeId: number) {
  const headers = await supportHeaders();

  const response = await fetch(`${config.apiBaseUrl}/account-merges/${mergeId}/cancel`, {
    method: "POST",
    headers,
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? `Failed to cancel merge: ${response.status}`);
  }

  revalidatePath("/support/users");
  redirect(`/support/merges?updated=cancelled`);
}
