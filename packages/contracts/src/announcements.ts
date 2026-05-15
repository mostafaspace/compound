import type { AuthenticatedUser, UserRole } from "./platform";

export const announcementCategoryValues = [
  "general",
  "building",
  "association_decision",
  "security_alert",
  "maintenance_notice",
  "meeting_reminder",
] as const;

export type AnnouncementCategory = (typeof announcementCategoryValues)[number];

export const announcementPriorityValues = ["low", "normal", "high", "critical"] as const;

export type AnnouncementPriority = (typeof announcementPriorityValues)[number];

export const announcementStatusValues = ["draft", "scheduled", "published", "expired", "archived"] as const;

export type AnnouncementStatus = (typeof announcementStatusValues)[number];

export const announcementTargetTypeValues = ["all", "compound", "building", "floor", "unit", "role"] as const;

export type AnnouncementTargetType = (typeof announcementTargetTypeValues)[number];

export interface LocalizedAnnouncementText {
  en: string;
  ar: string;
}

export interface AnnouncementAttachment {
  id?: string;
  name?: string;
  url?: string;
  downloadUrl?: string;
  mimeType?: string;
  size?: number;
  createdAt?: string;
}

export interface AnnouncementAcknowledgementSummary {
  required: boolean;
  targetedCount: number;
  acknowledgedCount: number;
  pendingCount: number;
}

export interface AnnouncementAcknowledgement {
  userId: number;
  userName: string | null;
  acknowledgedAt: string;
}

export interface Announcement {
  id: string;
  category: AnnouncementCategory;
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
  targetType: AnnouncementTargetType;
  targetIds: string[];
  targetRole: UserRole | null;
  requiresVerifiedMembership: boolean;
  requiresAcknowledgement: boolean;
  title: LocalizedAnnouncementText;
  body: LocalizedAnnouncementText;
  attachments: AnnouncementAttachment[];
  revision: number;
  scheduledAt: string | null;
  publishedAt: string | null;
  expiresAt: string | null;
  archivedAt: string | null;
  acknowledgementSummary?: AnnouncementAcknowledgementSummary;
  acknowledgedAt?: string | null;
  author?: Pick<AuthenticatedUser, "id" | "name" | "email">;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AnnouncementFilters {
  status?: AnnouncementStatus | "all";
  category?: AnnouncementCategory | "all";
  targetType?: AnnouncementTargetType | "all";
  targetId?: string;
  authorId?: number;
  from?: string;
  to?: string;
  search?: string;
  perPage?: number;
}

export interface UpsertAnnouncementInput {
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
  category: AnnouncementCategory;
  priority?: AnnouncementPriority;
  targetType: AnnouncementTargetType;
  targetIds?: string[];
  targetRole?: UserRole | null;
  requiresVerifiedMembership?: boolean;
  requiresAcknowledgement?: boolean;
  scheduledAt?: string | null;
  expiresAt?: string | null;
  attachments?: AnnouncementAttachment[];
}

export type CreateAnnouncementInput = UpsertAnnouncementInput;

export type UpdateAnnouncementInput = Partial<UpsertAnnouncementInput>;
