export const userRoleValues = [
  "super_admin",
  "compound_admin",
  "board_member",
  "finance_reviewer",
  "security_guard",
  "resident_owner",
  "resident_tenant",
  "support_agent"
] as const;

export type UserRole = (typeof userRoleValues)[number];

export const unitRelationValues = ["owner", "tenant", "resident", "representative"] as const;

export type UnitRelation = (typeof unitRelationValues)[number];

export const verificationStatusValues = ["pending", "verified", "rejected", "expired"] as const;

export type VerificationStatus = (typeof verificationStatusValues)[number];

export const verificationRequestStatusValues = ["pending_review", "more_info_requested", "approved", "rejected"] as const;

export type VerificationRequestStatus = (typeof verificationRequestStatusValues)[number];

export const invitationStatusValues = ["pending", "accepted", "revoked", "expired"] as const;

export type InvitationStatus = (typeof invitationStatusValues)[number];

export const notificationCategoryValues = ["documents", "visitors", "issues", "announcements", "finance", "system"] as const;

export type NotificationCategory = (typeof notificationCategoryValues)[number];

export const notificationPriorityValues = ["low", "normal", "high"] as const;

export type NotificationPriority = (typeof notificationPriorityValues)[number];

export interface ApiEnvelope<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface PaginatedEnvelope<T> extends ApiEnvelope<T[]> {
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number | null;
    last_page: number;
    per_page: number;
    to: number | null;
    total: number;
  };
}

export interface AuthenticatedUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: "invited" | "pending_review" | "active" | "suspended" | "archived";
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
}

export interface InvitationUnitSummary {
  id: string;
  compoundId: string;
  buildingId: string;
  floorId: string | null;
  unitNumber: string;
}

export interface ResidentInvitation {
  id: number;
  email: string;
  role: UserRole;
  relationType: UnitRelation | null;
  status: InvitationStatus;
  expiresAt: string | null;
  acceptedAt: string | null;
  revokedAt: string | null;
  lastSentAt: string | null;
  deliveryCount: number;
  user?: AuthenticatedUser;
  unit?: InvitationUnitSummary | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateResidentInvitationInput {
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  unitId?: string;
  relationType?: UnitRelation;
  startsAt?: string;
  isPrimary?: boolean;
  expiresAt?: string;
}

export interface AcceptResidentInvitationInput {
  name: string;
  phone?: string;
  password: string;
  password_confirmation: string;
}

export interface VerificationRequest {
  id: number;
  userId: number;
  user?: AuthenticatedUser;
  residentInvitationId: number | null;
  residentInvitation?: ResidentInvitation | null;
  unitId: string | null;
  unit?: InvitationUnitSummary | null;
  requestedRole: UserRole;
  relationType: UnitRelation | null;
  status: VerificationRequestStatus;
  submittedAt: string | null;
  reviewedBy: number | null;
  reviewer?: AuthenticatedUser | null;
  reviewedAt: string | null;
  decisionNote: string | null;
  moreInfoNote: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ReviewVerificationRequestInput {
  note?: string;
}

export interface LoginInput {
  email: string;
  password: string;
  deviceName: string;
}

export interface LoginResult {
  token: string;
  tokenType: "Bearer";
  user: AuthenticatedUser;
}

export interface UserNotification {
  id: string;
  userId: number;
  category: NotificationCategory;
  channel: "in_app";
  priority: NotificationPriority;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  readAt: string | null;
  archivedAt: string | null;
  deliveredAt: string | null;
  deliveryAttempts: number;
  lastDeliveryError: string | null;
  createdAt: string;
}

export interface NotificationPreference {
  id: string;
  userId: number;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  pushEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  quietHoursTimezone: string | null;
  mutedCategories: NotificationCategory[];
  createdAt: string;
  updatedAt: string;
}

export interface UpdateNotificationPreferenceInput {
  emailEnabled?: boolean;
  inAppEnabled?: boolean;
  pushEnabled?: boolean;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
  quietHoursTimezone?: string | null;
  mutedCategories?: NotificationCategory[];
}

export const auditSeverityValues = ["info", "warning", "critical"] as const;
export type AuditSeverity = (typeof auditSeverityValues)[number];

export interface AuditLogEntry {
  id: number;
  actorId: number | null;
  actor?: AuthenticatedUser | null;
  action: string;
  auditableType: string | null;
  auditableId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  method: string | null;
  path: string | null;
  statusCode: number | null;
  severity: AuditSeverity;
  reason: string | null;
  metadata: Record<string, unknown>;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AuditLogFilters {
  action?: string;
  actorId?: number;
  auditableType?: string;
  auditableId?: string;
  from?: string;
  method?: string;
  module?: string;
  perPage?: number;
  q?: string;
  severity?: AuditSeverity;
  to?: string;
}

// ─── User lifecycle (CM-79) ───────────────────────────────────────────────────

export const accountMergeStatusValues = ["pending", "completed", "cancelled"] as const;
export type AccountMergeStatus = (typeof accountMergeStatusValues)[number];

export interface AccountMergeUser {
  id: number;
  name: string;
  email: string;
  status: string;
}

export interface AccountMerge {
  id: number;
  sourceUser: AccountMergeUser | null;
  targetUser: AccountMergeUser | null;
  initiator: { id: number; name: string } | null;
  status: AccountMergeStatus;
  notes: string | null;
  mergeAnalysis: Record<string, unknown> | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string | null;
}

export interface UserMembershipSummary {
  id: number;
  unitId: string;
  unitName: string | null;
  unitNumber: string | null;
  relationType: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isPrimary: boolean;
  verificationStatus: string | null;
}

export interface UserSupportView {
  user: AuthenticatedUser;
  memberships: UserMembershipSummary[];
  documentCounts: Record<string, number>;
  verificationStatus: string | null;
  recentAuditEvents: AuditLogEntry[];
  activeMerges: Array<{
    id: number;
    sourceUserId: number;
    targetUserId: number;
    status: AccountMergeStatus;
    notes: string | null;
    createdAt: string | null;
  }>;
}

export interface UserListFilters {
  q?: string;
  status?: string;
  role?: string;
  perPage?: number;
}

// ─── Operational analytics (CM-80) ────────────────────────────────────────────

export interface OperationalAnalyticsUserMetrics {
  total: number;
  active: number;
  invited: number;
  pendingReview: number;
  suspended: number;
  archived: number;
}

export interface OperationalAnalyticsInvitationMetrics {
  total: number;
  pending: number;
  accepted: number;
  revoked: number;
  expired: number;
}

export interface OperationalAnalyticsVerificationMetrics {
  total: number;
  pendingReview: number;
  moreInfoRequested: number;
  approved: number;
  rejected: number;
}

export interface OperationalAnalyticsDocumentMetrics {
  total: number;
  submitted: number;
  approved: number;
  rejected: number;
}

export interface OperationalAnalyticsVisitorMetrics {
  total: number;
  pending: number;
  allowed: number;
  denied: number;
  completed: number;
  cancelled: number;
}

export interface OperationalAnalyticsIssueMetrics {
  total: number;
  new: number;
  inProgress: number;
  escalated: number;
  resolved: number;
  closed: number;
}

export interface OperationalAnalyticsAnnouncementMetrics {
  total: number;
  draft: number;
  published: number;
  archived: number;
  requiresAckCount: number;
  ackCount: number;
}

export interface OperationalAnalyticsVoteMetrics {
  total: number;
  draft: number;
  active: number;
  closed: number;
  cancelled: number;
  participations: number;
}

export interface OperationalAnalytics {
  users: OperationalAnalyticsUserMetrics;
  invitations: OperationalAnalyticsInvitationMetrics;
  verifications: OperationalAnalyticsVerificationMetrics;
  documents: OperationalAnalyticsDocumentMetrics;
  visitors: OperationalAnalyticsVisitorMetrics;
  issues: OperationalAnalyticsIssueMetrics;
  announcements: OperationalAnalyticsAnnouncementMetrics;
  votes: OperationalAnalyticsVoteMetrics;
  generatedAt: string;
}

export interface OperationalAnalyticsFilters {
  buildingId?: string;
  from?: string;
  to?: string;
}
