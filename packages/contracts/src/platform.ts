export const userRoleValues = [
  "super_admin",
  "compound_admin",
  "president",
  "board_member",
  "finance_reviewer",
  "security_guard",
  "resident_owner",
  "resident_tenant",
  "resident",
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

export const notificationCategoryValues = ["documents", "visitors", "issues", "announcements", "polls", "finance", "system", "vehicles"] as const;

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

export interface ScopeAssignment {
  role: string;
  scope_type: 'global' | 'compound' | 'building' | 'floor' | 'unit';
  scope_id: string | null;
}

export interface AuthenticatedUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  compoundId: string | null;
  role: UserRole;
  status: "invited" | "pending_review" | "active" | "suspended" | "archived";
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  roles: string[];
  permissions: string[];
  scopes: ScopeAssignment[];
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

export const ownerRegistrationStatusValues = ["under_review", "approved", "denied"] as const;

export type OwnerRegistrationStatus = (typeof ownerRegistrationStatusValues)[number];

export interface OwnerRegistrationBuilding {
  id: string;
  code: string;
  label: string;
  type?: string | null;
}

export interface OwnerRegistrationDocument {
  id: number;
  type: "id_card" | "contract" | "handover";
  originalName: string;
  mimeType: string | null;
  sizeBytes: number | null;
}

export interface OwnerRegistrationRequest {
  id: string;
  requestToken?: string;
  status: OwnerRegistrationStatus;
  fullNameArabic: string;
  phone: string;
  email: string;
  apartmentCode: string;
  ownerAcknowledged: boolean;
  building: OwnerRegistrationBuilding | null;
  documents: OwnerRegistrationDocument[];
  decisionReason: string | null;
  reviewedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  login?: {
    email: string;
    username: string;
    requiresPasswordReset: boolean;
    passwordSetupToken: string | null;
    passwordSetupExpiresAt: string | null;
  };
}

export interface OwnerRegistrationBuildingsResponse {
  data: OwnerRegistrationBuilding[];
  meta: {
    compound: {
      id: string;
      name: string;
      code: string;
    };
  };
}

export interface ReviewOwnerRegistrationInput {
  createUnitIfMissing?: boolean;
  note?: string;
}

export interface DenyOwnerRegistrationInput {
  reason: string;
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

// ─── Security operations (CM-81) ─────────────────────────────────────────────

export type SecurityIncidentType =
  | "denied_entry"
  | "suspicious_activity"
  | "emergency"
  | "vehicle_issue"
  | "operational_handover"
  | "other";

export type SecurityShiftStatus = "draft" | "active" | "closed";
export type SecurityDeviceStatus = "active" | "revoked";

export interface SecurityGate {
  id: string;
  compoundId: string;
  buildingId: string | null;
  name: string;
  zone: string | null;
  description: string | null;
  isActive: boolean;
  building?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface SecurityShiftAssignment {
  id: number;
  shiftId: string;
  gateId: string | null;
  guardUserId: number;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  isActive: boolean;
  guardUser?: { id: number; name: string } | null;
  gate?: { id: string; name: string } | null;
}

export interface SecurityShift {
  id: string;
  compoundId: string;
  name: string;
  status: SecurityShiftStatus;
  handoverNotes: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdBy: number;
  closedBy: number | null;
  creator?: { id: number; name: string } | null;
  closer?: { id: number; name: string } | null;
  assignments?: SecurityShiftAssignment[];
  createdAt: string;
  updatedAt: string;
}

export interface SecurityDevice {
  id: string;
  compoundId: string;
  name: string;
  deviceIdentifier: string;
  appVersion: string | null;
  lastSeenAt: string | null;
  status: SecurityDeviceStatus;
  registeredBy: number;
  revokedBy: number | null;
  revokedAt: string | null;
  registeredByUser?: { id: number; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface SecurityIncident {
  id: string;
  compoundId: string;
  gateId: string | null;
  shiftId: string | null;
  reportedBy: number;
  type: SecurityIncidentType;
  title: string;
  description: string;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  occurredAt: string;
  resolvedAt: string | null;
  gate?: { id: string; name: string } | null;
  shift?: { id: string; name: string } | null;
  reporter?: { id: number; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ManualVisitorEntry {
  id: string;
  compoundId: string;
  gateId: string | null;
  shiftId: string | null;
  processedBy: number;
  visitorName: string;
  visitorPhone: string | null;
  vehiclePlate: string | null;
  hostUserId: number | null;
  hostUnitId: string | null;
  reason: string;
  notes: string | null;
  status: "allowed" | "denied";
  occurredAt: string;
  gate?: { id: string; name: string } | null;
  shift?: { id: string; name: string } | null;
  processedByUser?: { id: number; name: string } | null;
  host?: { id: number; name: string } | null;
  hostUnit?: { id: string; unitNumber: string } | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Meetings ────────────────────────────────────────────────────────────────

export type MeetingStatus = "draft" | "scheduled" | "in_progress" | "completed" | "cancelled";
export type MeetingScope = "association" | "building" | "floor" | "committee";
export type MeetingActionItemStatus = "open" | "in_progress" | "done" | "cancelled";
export type RsvpStatus = "pending" | "accepted" | "declined" | "tentative";

export interface MeetingAgendaItem {
  id: string;
  meetingId: string;
  title: string;
  description: string | null;
  position: number;
  durationMinutes: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingParticipant {
  id: string;
  meetingId: string;
  userId: number;
  rsvpStatus: RsvpStatus;
  invitedAt: string;
  attended: boolean;
  user?: { id: number; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingMinutes {
  id: string;
  meetingId: string;
  body: string;
  publishedAt: string | null;
  createdBy: number;
  updatedBy: number | null;
  author?: { id: number; name: string } | null;
  lastEditor?: { id: number; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingDecision {
  id: string;
  meetingId: string;
  title: string;
  description: string | null;
  linkedType: string | null;
  linkedId: string | null;
  createdBy: number;
  creator?: { id: number; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingActionItem {
  id: string;
  meetingId: string;
  title: string;
  description: string | null;
  assignedTo: number | null;
  dueDate: string | null;
  status: MeetingActionItemStatus;
  completedAt: string | null;
  createdBy: number;
  assignee?: { id: number; name: string } | null;
  creator?: { id: number; name: string } | null;
  meeting?: { id: string; title: string } | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Privacy ─────────────────────────────────────────────────────────────────

export type PolicyType = "privacy_policy" | "terms_of_service" | "data_processing";
export type ExportRequestStatus = "pending" | "processing" | "ready" | "failed" | "expired";

export interface UserPolicyConsent {
  id: number;
  userId: number;
  policyType: PolicyType;
  policyVersion: string;
  acceptedAt: string;
  ipAddress: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DataExportRequest {
  id: string;
  requestedBy: number;
  userId: number;
  status: ExportRequestStatus;
  modules: string[] | null;
  packagePath: string | null;
  expiresAt: string | null;
  processedAt: string | null;
  processedBy: number | null;
  notes: string | null;
  requester?: { id: number; name: string } | null;
  subject?: { id: number; name: string; email: string } | null;
  processor?: { id: number; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Localization ─────────────────────────────────────────────────────────────

export interface LocaleSettings {
  compoundId: string | null;
  locale: string;
  timezone: string;
  currency: string;
  currencySymbol: string;
  dateFormat: string;
  phoneCountryCode: string;
}

// ─── Maintenance Work Orders ──────────────────────────────────────────────────

export type WorkOrderStatus = "draft" | "requested" | "quoted" | "approved" | "scheduled" | "in_progress" | "completed" | "rejected" | "cancelled";
export type WorkOrderPriority = "low" | "medium" | "high" | "urgent";
export type WorkOrderCategory = "plumbing" | "electrical" | "hvac" | "painting" | "cleaning" | "landscaping" | "security" | "general" | "other";
export type EstimateStatus = "pending" | "approved" | "rejected";

export interface WorkOrderEstimate {
  id: string;
  workOrderId: string;
  vendorId: string | null;
  amount: string;
  notes: string | null;
  status: EstimateStatus;
  submittedBy: number;
  reviewedBy: number | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  vendor?: { id: string; name: string } | null;
  submitter?: { id: number; name: string } | null;
  reviewer?: { id: number; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkOrder {
  id: string;
  compoundId: string;
  issueId: string | null;
  vendorId: string | null;
  buildingId: string | null;
  unitId: string | null;
  title: string;
  description: string | null;
  category: WorkOrderCategory;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  estimatedCost: string | null;
  approvedCost: string | null;
  actualCost: string | null;
  expenseId: string | null;
  createdBy: number;
  assignedTo: number | null;
  approvedBy: number | null;
  cancelledBy: number | null;
  targetCompletionAt: string | null;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  approvedAt: string | null;
  cancelledAt: string | null;
  completionNotes: string | null;
  rejectionReason: string | null;
  creator?: { id: number; name: string } | null;
  assignee?: { id: number; name: string } | null;
  approver?: { id: number; name: string } | null;
  vendor?: { id: string; name: string } | null;
  building?: { id: string; name: string } | null;
  issue?: { id: string; title: string } | null;
  estimates?: WorkOrderEstimate[];
  createdAt: string;
  updatedAt: string;
}

export interface Meeting {
  id: string;
  compoundId: string;
  title: string;
  scope: MeetingScope;
  status: MeetingStatus;
  description: string | null;
  location: string | null;
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  cancelledAt: string | null;
  cancelledBy: number | null;
  createdBy: number;
  creator?: { id: number; name: string } | null;
  cancelledByUser?: { id: number; name: string } | null;
  agendaItems?: MeetingAgendaItem[];
  participants?: MeetingParticipant[];
  minutes?: MeetingMinutes | null;
  decisions?: MeetingDecision[];
  actionItems?: MeetingActionItem[];
  createdAt: string;
  updatedAt: string;
}
