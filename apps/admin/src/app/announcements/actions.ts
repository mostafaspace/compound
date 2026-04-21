"use server";

import type {
  AnnouncementCategory,
  AnnouncementPriority,
  AnnouncementTargetType,
  UserRole,
} from "@compound/contracts";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  archiveAnnouncement,
  createAnnouncement,
  publishAnnouncement,
  updateAnnouncement,
} from "@/lib/api";

function nullableDate(value: FormDataEntryValue | null): string | null {
  const date = String(value ?? "").trim();

  return date ? new Date(date).toISOString() : null;
}

function targetIdsFromForm(value: FormDataEntryValue | null): string[] | undefined {
  const ids = String(value ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  return ids.length > 0 ? ids : undefined;
}

function announcementPayload(formData: FormData) {
  const targetType = String(formData.get("targetType") ?? "all") as AnnouncementTargetType;
  const targetRole = String(formData.get("targetRole") ?? "").trim();
  const attachmentUrl = String(formData.get("attachmentUrl") ?? "").trim();
  const attachmentName = String(formData.get("attachmentName") ?? "").trim();

  return {
    titleEn: String(formData.get("titleEn") ?? "").trim(),
    titleAr: String(formData.get("titleAr") ?? "").trim(),
    bodyEn: String(formData.get("bodyEn") ?? "").trim(),
    bodyAr: String(formData.get("bodyAr") ?? "").trim(),
    category: String(formData.get("category") ?? "general") as AnnouncementCategory,
    priority: String(formData.get("priority") ?? "normal") as AnnouncementPriority,
    targetType,
    targetIds: targetType === "all" || targetType === "role" ? undefined : targetIdsFromForm(formData.get("targetIds")),
    targetRole: targetType === "role" && targetRole ? (targetRole as UserRole) : null,
    requiresVerifiedMembership: formData.get("requiresVerifiedMembership") === "1",
    requiresAcknowledgement: formData.get("requiresAcknowledgement") === "1",
    scheduledAt: nullableDate(formData.get("scheduledAt")),
    expiresAt: nullableDate(formData.get("expiresAt")),
    attachments: attachmentUrl ? [{ name: attachmentName || attachmentUrl, url: attachmentUrl }] : undefined,
  };
}

export async function createAnnouncementAction(formData: FormData) {
  await createAnnouncement(announcementPayload(formData));

  revalidatePath("/announcements");
  redirect("/announcements?created=1");
}

export async function updateAnnouncementAction(announcementId: string, formData: FormData) {
  await updateAnnouncement(announcementId, announcementPayload(formData));

  revalidatePath("/announcements");
  redirect("/announcements?updated=1");
}

export async function publishAnnouncementAction(announcementId: string) {
  await publishAnnouncement(announcementId);

  revalidatePath("/announcements");
  redirect("/announcements?published=1");
}

export async function archiveAnnouncementAction(announcementId: string) {
  await archiveAnnouncement(announcementId);

  revalidatePath("/announcements");
  redirect("/announcements?archived=1");
}
