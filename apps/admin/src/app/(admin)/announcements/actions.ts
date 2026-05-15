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
  uploadAnnouncementAttachment,
} from "@/lib/api";

function nullableDate(value: FormDataEntryValue | null): string | null {
  const date = String(value ?? "").trim();

  return date ? new Date(date).toISOString() : null;
}

function targetIdsFromForm(formData: FormData): string[] | undefined {
  const ids = formData
    .getAll("targetIds")
    .flatMap((value) => String(value ?? "").split(","))
    .map((id) => id.trim())
    .filter(Boolean);

  return ids.length > 0 ? Array.from(new Set(ids)) : undefined;
}

function announcementPayload(formData: FormData) {
  const targetType = String(formData.get("targetType") ?? "all") as AnnouncementTargetType;
  const targetRole = String(formData.get("targetRole") ?? "").trim();

  return {
    titleEn: String(formData.get("titleEn") ?? "").trim(),
    titleAr: String(formData.get("titleAr") ?? "").trim(),
    bodyEn: String(formData.get("bodyEn") ?? "").trim(),
    bodyAr: String(formData.get("bodyAr") ?? "").trim(),
    category: String(formData.get("category") ?? "general") as AnnouncementCategory,
    priority: String(formData.get("priority") ?? "normal") as AnnouncementPriority,
    targetType,
    targetIds: targetType === "all" || targetType === "role" ? undefined : targetIdsFromForm(formData),
    targetRole: targetType === "role" && targetRole ? (targetRole as UserRole) : null,
    requiresVerifiedMembership: formData.get("requiresVerifiedMembership") === "1",
    requiresAcknowledgement: formData.get("requiresAcknowledgement") === "1",
    scheduledAt: nullableDate(formData.get("scheduledAt")),
    expiresAt: nullableDate(formData.get("expiresAt")),
  };
}

function photoFilesFromForm(formData: FormData): File[] {
  return formData
    .getAll("photos")
    .filter((value): value is File => value instanceof File && value.size > 0);
}

async function uploadAnnouncementPhotos(announcementId: string, formData: FormData): Promise<void> {
  const files = photoFilesFromForm(formData);

  for (const file of files) {
    await uploadAnnouncementAttachment(announcementId, file);
  }
}

export async function createAnnouncementAction(formData: FormData) {
  const announcement = await createAnnouncement(announcementPayload(formData));
  await uploadAnnouncementPhotos(announcement.id, formData);

  revalidatePath("/announcements");
  redirect("/announcements?created=1");
}

export async function updateAnnouncementAction(announcementId: string, formData: FormData) {
  await updateAnnouncement(announcementId, announcementPayload(formData));
  await uploadAnnouncementPhotos(announcementId, formData);

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
