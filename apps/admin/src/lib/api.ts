import "server-only";

import { getCompoundContext } from "@/lib/session";
import type {
  ApiEnvelope,
  Announcement,
  OperationalAnalytics,
  OperationalAnalyticsFilters,
  ImportBatch,
  ImportBatchType,
  ReserveFund,
  ReserveFundMovement,
  Vendor,
  Budget,
  Expense,
  PaymentSession,
  GatewayTransaction,
  NotificationTemplate,
  NotificationDeliveryLog,
  AnnouncementAcknowledgement,
  AnnouncementAcknowledgementSummary,
  AnnouncementFilters,
  AuditLogEntry,
  AuditLogFilters,
  BuildingDetail,
  BuildingSummary,
  CompoundDetail,
  AuthenticatedUser,
  CreateAnnouncementInput,
  CreateResidentInvitationInput,
  CompoundSummary,
  CreateBuildingInput,
  CreateCompoundInput,
  CreateFloorInput,
  CreateUnitMembershipInput,
  CreateUnitInput,
  CreateVisitorRequestInput,
  CreateLedgerEntryInput,
  CreateUnitAccountInput,
  CreateVoteInput,
  FinanceReportSummary,
  FinancePaymentMethodRow,
  FinanceReportAccountsFilters,
  Vote,
  VoteEligibilityResult,
  VoteFilters,
  DocumentStatus,
  DocumentType,
  FloorSummary,
  InvitationStatus,
  Issue,
  IssueAttachment,
  IssueCategory,
  IssueStatus,
  ResidentInvitation,
  LoginInput,
  LoginResult,
  NotificationCategory,
  NotificationPreference,
  PaginatedEnvelope,
  PaymentStatus,
  PaymentSubmission,
  UnitDetail,
  UnitAccount,
  UnitSummary,
  UpdateBuildingInput,
  UpdateAnnouncementInput,
  UpdateCompoundInput,
  UpdateFloorInput,
  UpdateIssueInput,
  UpdateNotificationPreferenceInput,
  UpdateUnitInput,
  UserNotification,
  UserDocument,
  VerificationRequest,
  VerificationRequestStatus,
  VisitorDecisionInput,
  VisitorPassValidationResult,
  VisitorRequest,
  VisitorRequestStatus,
  SettingsNamespaceData,
  UpdateSettingsInput,
  UserSupportView,
  UserListFilters,
  AccountMerge,
  SecurityGate,
  SecurityShift,
  SecurityDevice,
  SecurityIncident,
  ManualVisitorEntry,
  Meeting,
  MeetingActionItem,
  WorkOrder,
  DataExportRequest,
  LocaleSettings,
  Poll,
  PollType,
  CreatePollInput,
  CreatePollTypeInput,
  PollStatus,
} from "@compound/contracts";

import { config } from "./config";
import { getAuthToken } from "./session";

export interface SystemStatus {
  service: string;
  status: "ok" | "degraded" | "down";
  environment: string;
  timezone: string;
}

async function apiHeaders(authenticated = false): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (authenticated) {
    const token = await getAuthToken();

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    // Pass the active compound context so the API scopes responses correctly.
    const compoundId = await getCompoundContext();
    if (compoundId) {
      headers["X-Compound-Id"] = compoundId;
    }
  }

  return headers;
}

export async function getSystemStatus(): Promise<SystemStatus | null> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/status`, {
      cache: "no-store",
      headers: await apiHeaders(),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as ApiEnvelope<SystemStatus>;

    return payload.data;
  } catch {
    return null;
  }
}

export interface DashboardData {
  role: string;
  attentionItems: Array<{ type: string; label: string; count: number; route: string }>;
  shortcuts: Array<{ key: string; label: string; route: string; icon: string }>;
  stats: Record<string, number>;
}

export async function getDashboard(): Promise<DashboardData | null> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/dashboard`, {
      cache: "no-store",
      headers: await apiHeaders(),
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as ApiEnvelope<DashboardData>;
    return payload.data;
  } catch {
    return null;
  }
}

export async function getAuditLogs(input: AuditLogFilters = {}): Promise<AuditLogEntry[]> {
  try {
    const params = new URLSearchParams();

    if (input.action) params.set("action", input.action);
    if (input.actorId) params.set("actorId", String(input.actorId));
    if (input.auditableType) params.set("auditableType", input.auditableType);
    if (input.auditableId) params.set("auditableId", input.auditableId);
    if (input.from) params.set("from", input.from);
    if (input.method) params.set("method", input.method);
    if (input.module) params.set("module", input.module);
    if (input.perPage) params.set("perPage", String(input.perPage));
    if (input.q) params.set("q", input.q);
    if (input.severity) params.set("severity", input.severity);
    if (input.to) params.set("to", input.to);

    const query = params.toString();
    const response = await fetch(`${config.apiBaseUrl}/audit-logs${query ? `?${query}` : ""}`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as PaginatedEnvelope<AuditLogEntry>;

    return payload.data;
  } catch {
    return [];
  }
}

export async function getAuditTimeline(entityType: string, entityId: string): Promise<AuditLogEntry[]> {
  try {
    const params = new URLSearchParams({ entity_type: entityType, entity_id: entityId });
    const response = await fetch(`${config.apiBaseUrl}/audit-logs/timeline?${params.toString()}`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as PaginatedEnvelope<AuditLogEntry>;

    return payload.data;
  } catch {
    return [];
  }
}

export function auditExportUrl(input: AuditLogFilters = {}): string {
  const params = new URLSearchParams();

  if (input.action) params.set("action", input.action);
  if (input.actorId) params.set("actorId", String(input.actorId));
  if (input.auditableType) params.set("auditableType", input.auditableType);
  if (input.auditableId) params.set("auditableId", input.auditableId);
  if (input.from) params.set("from", input.from);
  if (input.method) params.set("method", input.method);
  if (input.module) params.set("module", input.module);
  if (input.q) params.set("q", input.q);
  if (input.severity) params.set("severity", input.severity);
  if (input.to) params.set("to", input.to);

  const query = params.toString();

  return `${config.apiBaseUrl}/audit-logs/export${query ? `?${query}` : ""}`;
}

export async function login(input: LoginInput): Promise<LoginResult> {
  const response = await fetch(`${config.apiBaseUrl}/auth/login`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: {
      ...(await apiHeaders()),
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status}`);
  }

  const payload = (await response.json()) as ApiEnvelope<LoginResult>;

  return payload.data;
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/auth/me`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as ApiEnvelope<AuthenticatedUser>;

    return payload.data;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  await fetch(`${config.apiBaseUrl}/auth/logout`, {
    cache: "no-store",
    headers: await apiHeaders(true),
    method: "POST",
  });
}

export async function getNotifications(input: {
  category?: NotificationCategory | "all";
  read?: "all" | "read" | "unread";
  perPage?: number;
} = {}): Promise<UserNotification[]> {
  try {
    const params = new URLSearchParams();

    if (input.category && input.category !== "all") {
      params.set("category", input.category);
    }

    if (input.read && input.read !== "all") {
      params.set("read", input.read);
    }

    if (input.perPage) {
      params.set("per_page", String(input.perPage));
    }

    const query = params.toString();
    const response = await fetch(`${config.apiBaseUrl}/notifications${query ? `?${query}` : ""}`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as PaginatedEnvelope<UserNotification>;

    return payload.data;
  } catch {
    return [];
  }
}

export async function getUnreadNotificationCount(): Promise<number> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/notifications/unread-count`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });

    if (!response.ok) {
      return 0;
    }

    const payload = (await response.json()) as { unreadCount: number };

    return payload.unreadCount;
  } catch {
    return 0;
  }
}

export async function markNotificationRead(notificationId: string): Promise<UserNotification> {
  const response = await fetch(`${config.apiBaseUrl}/notifications/${notificationId}/read`, {
    headers: await apiHeaders(true),
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to mark notification read: ${response.status}`);
  }

  const payload = (await response.json()) as ApiEnvelope<UserNotification>;

  return payload.data;
}

export async function archiveNotification(notificationId: string): Promise<UserNotification> {
  const response = await fetch(`${config.apiBaseUrl}/notifications/${notificationId}/archive`, {
    headers: await apiHeaders(true),
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to archive notification: ${response.status}`);
  }

  const payload = (await response.json()) as ApiEnvelope<UserNotification>;

  return payload.data;
}

export async function markAllNotificationsRead(): Promise<number> {
  const response = await fetch(`${config.apiBaseUrl}/notifications/read-all`, {
    headers: await apiHeaders(true),
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to mark notifications read: ${response.status}`);
  }

  const payload = (await response.json()) as { count: number };

  return payload.count;
}

export async function archiveAllNotifications(): Promise<number> {
  const response = await fetch(`${config.apiBaseUrl}/notifications/archive-all`, {
    headers: await apiHeaders(true),
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to archive notifications: ${response.status}`);
  }

  const payload = (await response.json()) as { count: number };

  return payload.count;
}

export async function getNotificationPreferences(): Promise<NotificationPreference | null> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/notification-preferences`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as ApiEnvelope<NotificationPreference>;

    return payload.data;
  } catch {
    return null;
  }
}

export async function updateNotificationPreferences(
  input: UpdateNotificationPreferenceInput,
): Promise<NotificationPreference> {
  const response = await fetch(`${config.apiBaseUrl}/notification-preferences`, {
    body: JSON.stringify(input),
    headers: {
      ...(await apiHeaders(true)),
      "Content-Type": "application/json",
    },
    method: "PUT",
  });

  if (!response.ok) {
    throw new Error(`Failed to update notification preferences: ${response.status}`);
  }

  const payload = (await response.json()) as ApiEnvelope<NotificationPreference>;

  return payload.data;
}

export async function getAnnouncements(input: AnnouncementFilters = {}): Promise<Announcement[]> {
  try {
    const params = new URLSearchParams();

    if (input.status && input.status !== "all") {
      params.set("status", input.status);
    }

    if (input.category && input.category !== "all") {
      params.set("category", input.category);
    }

    if (input.targetType && input.targetType !== "all") {
      params.set("targetType", input.targetType);
    }

    if (input.targetId?.trim()) {
      params.set("targetId", input.targetId.trim());
    }

    if (input.authorId) {
      params.set("authorId", String(input.authorId));
    }

    if (input.from) {
      params.set("from", input.from);
    }

    if (input.to) {
      params.set("to", input.to);
    }

    if (input.search?.trim()) {
      params.set("search", input.search.trim());
    }

    if (input.perPage) {
      params.set("perPage", String(input.perPage));
    }

    const query = params.toString();
    const response = await fetch(`${config.apiBaseUrl}/announcements${query ? `?${query}` : ""}`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as PaginatedEnvelope<Announcement>;

    return payload.data;
  } catch {
    return [];
  }
}

export async function getAnnouncement(announcementId: string): Promise<Announcement | null> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/announcements/${announcementId}`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as ApiEnvelope<Announcement>;

    return payload.data;
  } catch {
    return null;
  }
}

export async function createAnnouncement(input: CreateAnnouncementInput): Promise<Announcement> {
  const response = await fetch(`${config.apiBaseUrl}/announcements`, {
    body: JSON.stringify(input),
    headers: {
      ...(await apiHeaders(true)),
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to create announcement: ${response.status}`);
  }

  const payload = (await response.json()) as ApiEnvelope<Announcement>;

  return payload.data;
}

export async function updateAnnouncement(announcementId: string, input: UpdateAnnouncementInput): Promise<Announcement> {
  const response = await fetch(`${config.apiBaseUrl}/announcements/${announcementId}`, {
    body: JSON.stringify(input),
    headers: {
      ...(await apiHeaders(true)),
      "Content-Type": "application/json",
    },
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error(`Failed to update announcement: ${response.status}`);
  }

  const payload = (await response.json()) as ApiEnvelope<Announcement>;

  return payload.data;
}

export async function publishAnnouncement(announcementId: string): Promise<Announcement> {
  const response = await fetch(`${config.apiBaseUrl}/announcements/${announcementId}/publish`, {
    headers: await apiHeaders(true),
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to publish announcement: ${response.status}`);
  }

  const payload = (await response.json()) as ApiEnvelope<Announcement>;

  return payload.data;
}

export async function archiveAnnouncement(announcementId: string): Promise<Announcement> {
  const response = await fetch(`${config.apiBaseUrl}/announcements/${announcementId}/archive`, {
    headers: await apiHeaders(true),
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to archive announcement: ${response.status}`);
  }

  const payload = (await response.json()) as ApiEnvelope<Announcement>;

  return payload.data;
}

export async function getAnnouncementAcknowledgements(announcementId: string): Promise<{
  summary: AnnouncementAcknowledgementSummary;
  data: AnnouncementAcknowledgement[];
} | null> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/announcements/${announcementId}/acknowledgements`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as {
      summary: AnnouncementAcknowledgementSummary;
      data: AnnouncementAcknowledgement[];
    };
  } catch {
    return null;
  }
}

export async function getFinanceUnitAccounts(input: { unitId?: string } = {}): Promise<UnitAccount[]> {
  try {
    const params = new URLSearchParams();

    if (input.unitId) {
      params.set("unitId", input.unitId);
    }

    const query = params.toString();
    const response = await fetch(`${config.apiBaseUrl}/finance/unit-accounts${query ? `?${query}` : ""}`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as PaginatedEnvelope<UnitAccount>;

    return payload.data;
  } catch {
    return [];
  }
}

export async function createFinanceUnitAccount(input: CreateUnitAccountInput): Promise<UnitAccount> {
  const response = await fetch(`${config.apiBaseUrl}/finance/unit-accounts`, {
    body: JSON.stringify(input),
    headers: {
      ...(await apiHeaders(true)),
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to create finance account: ${response.status}`);
  }

  const payload = (await response.json()) as ApiEnvelope<UnitAccount>;

  return payload.data;
}

export async function createFinanceLedgerEntry(unitAccountId: string, input: CreateLedgerEntryInput) {
  const response = await fetch(`${config.apiBaseUrl}/finance/unit-accounts/${unitAccountId}/ledger-entries`, {
    body: JSON.stringify(input),
    headers: {
      ...(await apiHeaders(true)),
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to create ledger entry: ${response.status}`);
  }
}

export async function getFinancePaymentSubmissions(input: { status?: PaymentStatus | "all" } = {}): Promise<PaymentSubmission[]> {
  try {
    const params = new URLSearchParams();

    if (input.status && input.status !== "all") {
      params.set("status", input.status);
    }

    const query = params.toString();
    const response = await fetch(`${config.apiBaseUrl}/finance/payment-submissions${query ? `?${query}` : ""}`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as PaginatedEnvelope<PaymentSubmission>;

    return payload.data;
  } catch {
    return [];
  }
}

export async function approveFinancePayment(paymentSubmissionId: string, input: { description?: string }) {
  const response = await fetch(`${config.apiBaseUrl}/finance/payment-submissions/${paymentSubmissionId}/approve`, {
    body: JSON.stringify(input),
    headers: {
      ...(await apiHeaders(true)),
      "Content-Type": "application/json",
    },
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error(`Failed to approve payment: ${response.status}`);
  }
}

export async function rejectFinancePayment(paymentSubmissionId: string, input: { reason: string }) {
  const response = await fetch(`${config.apiBaseUrl}/finance/payment-submissions/${paymentSubmissionId}/reject`, {
    body: JSON.stringify(input),
    headers: {
      ...(await apiHeaders(true)),
      "Content-Type": "application/json",
    },
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error(`Failed to reject payment: ${response.status}`);
  }
}

export async function requestFinancePaymentCorrection(paymentSubmissionId: string, input: { note: string }) {
  const response = await fetch(
    `${config.apiBaseUrl}/finance/payment-submissions/${paymentSubmissionId}/request-correction`,
    {
      body: JSON.stringify(input),
      headers: {
        ...(await apiHeaders(true)),
        "Content-Type": "application/json",
      },
      method: "PATCH",
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to request correction: ${response.status}`);
  }
}

export async function getCompounds(): Promise<CompoundSummary[]> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/compounds`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as PaginatedEnvelope<CompoundSummary>;

    return payload.data;
  } catch {
    return [];
  }
}

export async function getCompound(compoundId: string): Promise<CompoundDetail | null> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/compounds/${compoundId}`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as ApiEnvelope<CompoundDetail>;

    return payload.data;
  } catch {
    return null;
  }
}

// ─── Compound onboarding checklist ───────────────────────────────────────────

export interface OnboardingChecklistStep {
  key: string;
  label: string;
  completed: boolean;
}

export interface OnboardingChecklist {
  compoundId: string;
  compoundName: string;
  completedSteps: number;
  totalSteps: number;
  percentComplete: number;
  steps: OnboardingChecklistStep[];
}

export async function getCompoundOnboardingChecklist(compoundId: string): Promise<OnboardingChecklist | null> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/compounds/${compoundId}/onboarding-checklist`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { data: OnboardingChecklist };

    return payload.data;
  } catch {
    return null;
  }
}

export async function createCompound(input: CreateCompoundInput): Promise<CompoundSummary> {
  const response = await fetch(`${config.apiBaseUrl}/compounds`, {
    body: JSON.stringify(input),
    headers: {
      ...(await apiHeaders(true)),
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to create compound: ${response.status}`);
  }

  const payload = (await response.json()) as ApiEnvelope<CompoundSummary>;

  return payload.data;
}

export async function updateCompound(compoundId: string, input: UpdateCompoundInput): Promise<CompoundSummary> {
  const response = await fetch(`${config.apiBaseUrl}/compounds/${compoundId}`, {
    body: JSON.stringify(input),
    headers: {
      ...(await apiHeaders(true)),
      "Content-Type": "application/json",
    },
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error(`Failed to update compound: ${response.status}`);
  }

  const payload = (await response.json()) as ApiEnvelope<CompoundSummary>;

  return payload.data;
}

export async function archiveCompound(compoundId: string, reason?: string): Promise<CompoundSummary> {
  const response = await fetch(`${config.apiBaseUrl}/compounds/${compoundId}/archive`, {
    body: JSON.stringify({ reason }),
    headers: {
      ...(await apiHeaders(true)),
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to archive compound: ${response.status}`);
  }

  const payload = (await response.json()) as ApiEnvelope<CompoundSummary>;

  return payload.data;
}

export async function createBuilding(compoundId: string, input: CreateBuildingInput): Promise<BuildingSummary> {
  const response = await fetch(`${config.apiBaseUrl}/compounds/${compoundId}/buildings`, {
    body: JSON.stringify(input),
    headers: {
      ...(await apiHeaders(true)),
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to create building: ${response.status}`);
  }

  const payload = (await response.json()) as ApiEnvelope<BuildingSummary>;

  return payload.data;
}

export async function updateBuilding(buildingId: string, input: UpdateBuildingInput): Promise<BuildingSummary> {
  const response = await fetch(`${config.apiBaseUrl}/buildings/${buildingId}`, {
    body: JSON.stringify(input),
    headers: {
      ...(await apiHeaders(true)),
      "Content-Type": "application/json",
    },
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error(`Failed to update building: ${response.status}`);
  }

  const payload = (await response.json()) as ApiEnvelope<BuildingSummary>;

  return payload.data;
}

export async function archiveBuilding(buildingId: string, reason?: string): Promise<BuildingSummary> {
  const response = await fetch(`${config.apiBaseUrl}/buildings/${buildingId}/archive`, {
    body: JSON.stringify({ reason }),
    headers: {
      ...(await apiHeaders(true)),
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to archive building: ${response.status}`);
  }

  const payload = (await response.json()) as ApiEnvelope<BuildingSummary>;

  return payload.data;
}

export async function getBuilding(buildingId: string): Promise<BuildingDetail | null> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/buildings/${buildingId}`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as ApiEnvelope<BuildingDetail>;

    return payload.data;
  } catch {
    return null;
  }
}

export async function createFloor(buildingId: string, input: CreateFloorInput): Promise<FloorSummary> {
  const response = await fetch(`${config.apiBaseUrl}/buildings/${buildingId}/floors`, {
    body: JSON.stringify(input),
    headers: {
      ...(await apiHeaders(true)),
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to create floor: ${response.status}`);
  }

  const payload = (await response.json()) as ApiEnvelope<FloorSummary>;

  return payload.data;
}

export async function getFloor(floorId: string): Promise<FloorSummary | null> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/floors/${floorId}`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as ApiEnvelope<FloorSummary>;

    return payload.data;
  } catch {
    return null;
  }
}

export async function updateFloor(floorId: string, input: UpdateFloorInput): Promise<FloorSummary> {
  const response = await fetch(`${config.apiBaseUrl}/floors/${floorId}`, {
    body: JSON.stringify(input),
    headers: {
      ...(await apiHeaders(true)),
      "Content-Type": "application/json",
    },
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error(`Failed to update floor: ${response.status}`);
  }

  const payload = (await response.json()) as ApiEnvelope<FloorSummary>;

  return payload.data;
}

export async function archiveFloor(floorId: string, reason?: string): Promise<FloorSummary> {
  const response = await fetch(`${config.apiBaseUrl}/floors/${floorId}/archive`, {
    body: JSON.stringify({ reason }),
    headers: {
      ...(await apiHeaders(true)),
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to archive floor: ${response.status}`);
  }

  const payload = (await response.json()) as ApiEnvelope<FloorSummary>;

  return payload.data;
}

export async function createUnit(buildingId: string, input: CreateUnitInput): Promise<UnitSummary> {
  const response = await fetch(`${config.apiBaseUrl}/buildings/${buildingId}/units`, {
    body: JSON.stringify(input),
    headers: {
      ...(await apiHeaders(true)),
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to create unit: ${response.status}`);
  }

  const payload = (await response.json()) as ApiEnvelope<UnitSummary>;

  return payload.data;
}

export async function getUnit(unitId: string): Promise<UnitDetail | null> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/units/${unitId}`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as ApiEnvelope<UnitDetail>;

    return payload.data;
  } catch {
    return null;
  }
}

export async function updateUnit(unitId: string, input: UpdateUnitInput): Promise<UnitSummary> {
  const response = await fetch(`${config.apiBaseUrl}/units/${unitId}`, {
    body: JSON.stringify(input),
    headers: {
      ...(await apiHeaders(true)),
      "Content-Type": "application/json",
    },
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error(`Failed to update unit: ${response.status}`);
  }

  const payload = (await response.json()) as ApiEnvelope<UnitSummary>;

  return payload.data;
}

export async function archiveUnit(unitId: string, reason?: string): Promise<UnitSummary> {
  const response = await fetch(`${config.apiBaseUrl}/units/${unitId}/archive`, {
    body: JSON.stringify({ reason }),
    headers: {
      ...(await apiHeaders(true)),
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to archive unit: ${response.status}`);
  }

  const payload = (await response.json()) as ApiEnvelope<UnitSummary>;

  return payload.data;
}

export async function createUnitMembership(unitId: string, input: CreateUnitMembershipInput) {
  const response = await fetch(`${config.apiBaseUrl}/units/${unitId}/memberships`, {
    body: JSON.stringify(input),
    headers: {
      ...(await apiHeaders(true)),
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to create membership: ${response.status}`);
  }

  return response.json();
}

export async function endUnitMembership(membershipId: number) {
  const response = await fetch(`${config.apiBaseUrl}/unit-memberships/${membershipId}/end`, {
    headers: await apiHeaders(true),
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to end membership: ${response.status}`);
  }
}

export async function createResidentInvitation(input: CreateResidentInvitationInput): Promise<ResidentInvitation> {
  const response = await fetch(`${config.apiBaseUrl}/resident-invitations`, {
    body: JSON.stringify(input),
    headers: {
      ...(await apiHeaders(true)),
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to create resident invitation: ${response.status}`);
  }

  const payload = (await response.json()) as ApiEnvelope<ResidentInvitation>;

  return payload.data;
}

export async function getResidentInvitations(input: { status?: InvitationStatus | "all"; q?: string } = {}): Promise<ResidentInvitation[]> {
  try {
    const params = new URLSearchParams();

    if (input.status && input.status !== "all") {
      params.set("status", input.status);
    }

    if (input.q?.trim()) {
      params.set("q", input.q.trim());
    }

    const query = params.toString();
    const response = await fetch(`${config.apiBaseUrl}/resident-invitations${query ? `?${query}` : ""}`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as PaginatedEnvelope<ResidentInvitation>;

    return payload.data;
  } catch {
    return [];
  }
}

export async function revokeResidentInvitation(invitationId: number): Promise<ResidentInvitation> {
  const response = await fetch(`${config.apiBaseUrl}/resident-invitations/${invitationId}/revoke`, {
    headers: await apiHeaders(true),
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to revoke resident invitation: ${response.status}`);
  }

  const payload = (await response.json()) as ApiEnvelope<ResidentInvitation>;

  return payload.data;
}

export async function resendResidentInvitation(invitationId: number): Promise<ResidentInvitation> {
  const response = await fetch(`${config.apiBaseUrl}/resident-invitations/${invitationId}/resend`, {
    headers: await apiHeaders(true),
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to resend resident invitation: ${response.status}`);
  }

  const payload = (await response.json()) as ApiEnvelope<ResidentInvitation>;

  return payload.data;
}

export async function getVerificationRequests(input: { status?: VerificationRequestStatus | "all"; q?: string } = {}): Promise<VerificationRequest[]> {
  try {
    const params = new URLSearchParams();

    if (input.status && input.status !== "all") {
      params.set("status", input.status);
    }

    if (input.q?.trim()) {
      params.set("q", input.q.trim());
    }

    const query = params.toString();
    const response = await fetch(`${config.apiBaseUrl}/verification-requests${query ? `?${query}` : ""}`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as PaginatedEnvelope<VerificationRequest>;

    return payload.data;
  } catch {
    return [];
  }
}

async function updateVerificationRequest(
  verificationRequestId: number,
  action: "approve" | "reject" | "request-more-info",
  input: { note?: string },
): Promise<VerificationRequest> {
  const response = await fetch(`${config.apiBaseUrl}/verification-requests/${verificationRequestId}/${action}`, {
    body: JSON.stringify(input),
    headers: {
      ...(await apiHeaders(true)),
      "Content-Type": "application/json",
    },
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error(`Failed to update verification request: ${response.status}`);
  }

  const payload = (await response.json()) as ApiEnvelope<VerificationRequest>;

  return payload.data;
}

export async function approveVerificationRequest(verificationRequestId: number, input: { note?: string } = {}): Promise<VerificationRequest> {
  return updateVerificationRequest(verificationRequestId, "approve", input);
}

export async function rejectVerificationRequest(verificationRequestId: number, input: { note?: string }): Promise<VerificationRequest> {
  return updateVerificationRequest(verificationRequestId, "reject", input);
}

export async function requestMoreInfoForVerificationRequest(verificationRequestId: number, input: { note?: string }): Promise<VerificationRequest> {
  return updateVerificationRequest(verificationRequestId, "request-more-info", input);
}

export async function getResidentInvitation(token: string): Promise<ResidentInvitation | null> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/resident-invitations/${token}`, {
      cache: "no-store",
      headers: await apiHeaders(),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as ApiEnvelope<ResidentInvitation>;

    return payload.data;
  } catch {
    return null;
  }
}

export async function acceptResidentInvitation(token: string, input: {
  name: string;
  phone?: string;
  password: string;
  password_confirmation: string;
}): Promise<ResidentInvitation> {
  const response = await fetch(`${config.apiBaseUrl}/resident-invitations/${token}/accept`, {
    body: JSON.stringify(input),
    headers: {
      ...(await apiHeaders()),
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to accept resident invitation: ${response.status}`);
  }

  const payload = (await response.json()) as ApiEnvelope<ResidentInvitation>;

  return payload.data;
}

export async function getDocumentTypes(): Promise<DocumentType[]> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/document-types`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as PaginatedEnvelope<DocumentType>;

    return payload.data;
  } catch {
    return [];
  }
}

export async function getDocuments(): Promise<UserDocument[]> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/documents`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as PaginatedEnvelope<UserDocument>;

    return payload.data;
  } catch {
    return [];
  }
}

export async function uploadDocument(formData: FormData): Promise<UserDocument> {
  const response = await fetch(`${config.apiBaseUrl}/documents`, {
    body: formData,
    headers: await apiHeaders(true),
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to upload document: ${response.status}`);
  }

  const payload = (await response.json()) as ApiEnvelope<UserDocument>;

  return payload.data;
}

export async function reviewDocument(documentId: number, input: { status: DocumentStatus; reviewNote?: string }) {
  const response = await fetch(`${config.apiBaseUrl}/documents/${documentId}/review`, {
    body: JSON.stringify(input),
    headers: {
      ...(await apiHeaders(true)),
      "Content-Type": "application/json",
    },
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error(`Failed to review document: ${response.status}`);
  }
}

export async function getVisitorRequests(input: {
  status?: VisitorRequestStatus | "all";
} = {}): Promise<VisitorRequest[]> {
  try {
    const params = new URLSearchParams();

    if (input.status && input.status !== "all") {
      params.set("status", input.status);
    }

    const query = params.toString();
    const response = await fetch(`${config.apiBaseUrl}/visitor-requests${query ? `?${query}` : ""}`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as PaginatedEnvelope<VisitorRequest>;

    return payload.data;
  } catch {
    return [];
  }
}

export async function createVisitorRequest(input: CreateVisitorRequestInput): Promise<VisitorRequest> {
  const response = await fetch(`${config.apiBaseUrl}/visitor-requests`, {
    body: JSON.stringify(input),
    headers: {
      ...(await apiHeaders(true)),
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to create visitor request: ${response.status}`);
  }

  const payload = (await response.json()) as ApiEnvelope<VisitorRequest>;

  return payload.data;
}

export async function validateVisitorPass(token: string): Promise<VisitorPassValidationResult> {
  const response = await fetch(`${config.apiBaseUrl}/visitor-requests/validate-pass`, {
    body: JSON.stringify({ token }),
    headers: {
      ...(await apiHeaders(true)),
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to validate visitor pass: ${response.status}`);
  }

  const payload = (await response.json()) as ApiEnvelope<VisitorPassValidationResult>;

  return payload.data;
}

export async function arriveVisitorRequest(visitorRequestId: string): Promise<VisitorRequest> {
  return visitorDecision(visitorRequestId, "arrive");
}

export async function allowVisitorRequest(visitorRequestId: string): Promise<VisitorRequest> {
  return visitorDecision(visitorRequestId, "allow");
}

export async function denyVisitorRequest(visitorRequestId: string, input: VisitorDecisionInput = {}): Promise<VisitorRequest> {
  return visitorDecision(visitorRequestId, "deny", input);
}

export async function completeVisitorRequest(visitorRequestId: string): Promise<VisitorRequest> {
  return visitorDecision(visitorRequestId, "complete");
}

export async function cancelVisitorRequest(visitorRequestId: string, input: VisitorDecisionInput = {}): Promise<VisitorRequest> {
  return visitorDecision(visitorRequestId, "cancel", input);
}

async function visitorDecision(
  visitorRequestId: string,
  action: "arrive" | "allow" | "deny" | "complete" | "cancel",
  input: VisitorDecisionInput = {},
): Promise<VisitorRequest> {
  const response = await fetch(`${config.apiBaseUrl}/visitor-requests/${visitorRequestId}/${action}`, {
    body: JSON.stringify(input),
    headers: {
      ...(await apiHeaders(true)),
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to ${action} visitor request: ${response.status}`);
  }

  const payload = (await response.json()) as ApiEnvelope<VisitorRequest>;

  return payload.data;
}



export async function getIssues(input: {
  buildingId?: string;
  status?: IssueStatus | "all";
  category?: IssueCategory | "all";
} = {}): Promise<Issue[]> {
  try {
    const params = new URLSearchParams();

    if (input.buildingId) {
      params.set("building_id", input.buildingId);
    }
    if (input.status && input.status !== "all") {
      params.set("status", input.status);
    }
    if (input.category && input.category !== "all") {
      params.set("category", input.category);
    }

    const query = params.toString();
    const response = await fetch(`${config.apiBaseUrl}/issues${query ? `?${query}` : ""}`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });

    if (!response.ok) return [];
    
    // We expect paginated envelope
    const payload = await response.json();
    return payload.data;
  } catch {
    return [];
  }
}

export async function getIssue(issueId: string): Promise<Issue | null> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/issues/${issueId}`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });

    if (!response.ok) return null;

    const payload = await response.json() as ApiEnvelope<Issue>;
    return payload.data;
  } catch {
    return null;
  }
}

export async function updateIssue(issueId: string, input: UpdateIssueInput): Promise<Issue | null> {
  const response = await fetch(`${config.apiBaseUrl}/issues/${issueId}`, {
    body: JSON.stringify(input),
    headers: {
      ...(await apiHeaders(true)),
      "Content-Type": "application/json",
    },
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error(`Failed to update issue: ${response.status}`);
  }

  const payload = await response.json() as ApiEnvelope<Issue>;
  return payload.data;
}

export async function createIssueComment(issueId: string, body: string, isInternal = false) {
  const response = await fetch(`${config.apiBaseUrl}/issues/${issueId}/comments`, {
    body: JSON.stringify({ body, isInternal }),
    headers: {
      ...(await apiHeaders(true)),
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to create comment: ${response.status}`);
  }
}

export async function escalateIssue(issueId: string, reason: string): Promise<void> {
  const response = await fetch(`${config.apiBaseUrl}/issues/${issueId}/escalate`, {
    body: JSON.stringify({ reason }),
    headers: {
      ...(await apiHeaders(true)),
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to escalate issue: ${response.status}`);
  }
}

export async function getIssueAttachments(issueId: string): Promise<IssueAttachment[]> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/issues/${issueId}/attachments`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });

    if (!response.ok) return [];

    const payload = await response.json() as ApiEnvelope<IssueAttachment[]>;
    return payload.data ?? [];
  } catch {
    return [];
  }
}

// ─── Dues: Charge Types ────────────────────────────────────────────────────

export interface ChargeType {
  id: string;
  name: string;
  code: string;
  defaultAmount: string | null;
  isRecurring: boolean;
  createdAt: string;
}

export async function getChargeTypes(): Promise<ChargeType[]> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/finance/charge-types`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as { data: ChargeType[] };

    return payload.data;
  } catch {
    return [];
  }
}

export async function getChargeType(id: string): Promise<ChargeType | null> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/finance/charge-types/${id}`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { data: ChargeType };

    return payload.data;
  } catch {
    return null;
  }
}

export async function createChargeType(input: {
  name: string;
  code: string;
  defaultAmount: string | null;
  isRecurring: boolean;
}): Promise<ChargeType> {
  const response = await fetch(`${config.apiBaseUrl}/finance/charge-types`, {
    body: JSON.stringify(input),
    headers: {
      ...(await apiHeaders(true)),
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to create charge type: ${response.status}`);
  }

  const payload = (await response.json()) as { data: ChargeType };

  return payload.data;
}

export async function updateChargeType(
  id: string,
  input: {
    name: string;
    code: string;
    defaultAmount: string | null;
    isRecurring: boolean;
  },
): Promise<ChargeType> {
  const response = await fetch(`${config.apiBaseUrl}/finance/charge-types/${id}`, {
    body: JSON.stringify(input),
    headers: {
      ...(await apiHeaders(true)),
      "Content-Type": "application/json",
    },
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error(`Failed to update charge type: ${response.status}`);
  }

  const payload = (await response.json()) as { data: ChargeType };

  return payload.data;
}

// ─── Dues: Recurring Charges ───────────────────────────────────────────────

export interface RecurringCharge {
  id: string;
  compoundId: string;
  chargeTypeId: string | null;
  name: string;
  amount: string;
  currency: string;
  frequency: "monthly" | "quarterly" | "annual" | "one_time";
  billingDay: number | null;
  targetType: "all" | "floor" | "unit";
  targetIds: string[];
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  lastRunAt: string | null;
  createdAt: string;
}

export async function getRecurringCharges(input: {
  compound_id?: string;
  is_active?: boolean;
} = {}): Promise<RecurringCharge[]> {
  try {
    const params = new URLSearchParams();

    if (input.compound_id) {
      params.set("compound_id", input.compound_id);
    }

    if (input.is_active !== undefined) {
      params.set("is_active", input.is_active ? "1" : "0");
    }

    const query = params.toString();
    const response = await fetch(`${config.apiBaseUrl}/finance/recurring-charges${query ? `?${query}` : ""}`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as { data: RecurringCharge[] };

    return payload.data;
  } catch {
    return [];
  }
}

export async function createRecurringCharge(input: {
  name: string;
  amount: string;
  currency: string;
  frequency: string;
  billingDay?: number;
  targetType: string;
  compoundId?: string;
  startsAt?: string;
}): Promise<RecurringCharge> {
  const response = await fetch(`${config.apiBaseUrl}/finance/recurring-charges`, {
    body: JSON.stringify(input),
    headers: {
      ...(await apiHeaders(true)),
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to create recurring charge: ${response.status}`);
  }

  const payload = (await response.json()) as { data: RecurringCharge };

  return payload.data;
}

export async function deactivateRecurringCharge(id: string): Promise<RecurringCharge> {
  const response = await fetch(`${config.apiBaseUrl}/finance/recurring-charges/${id}/deactivate`, {
    headers: await apiHeaders(true),
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error(`Failed to deactivate recurring charge: ${response.status}`);
  }

  const payload = (await response.json()) as { data: RecurringCharge };

  return payload.data;
}

// ─── Dues: Collection Campaigns ───────────────────────────────────────────

export interface CollectionCampaign {
  id: string;
  compoundId: string;
  name: string;
  description: string | null;
  status: "draft" | "active" | "closed" | "archived";
  targetAmount: number | null;
  startedAt: string | null;
  closedAt: string | null;
  createdAt: string;
}

export async function getCollectionCampaigns(input: {
  compound_id?: string;
  status?: string;
} = {}): Promise<CollectionCampaign[]> {
  try {
    const params = new URLSearchParams();

    if (input.compound_id) {
      params.set("compound_id", input.compound_id);
    }

    if (input.status) {
      params.set("status", input.status);
    }

    const query = params.toString();
    const response = await fetch(`${config.apiBaseUrl}/finance/collection-campaigns${query ? `?${query}` : ""}`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as { data: CollectionCampaign[] };

    return payload.data;
  } catch {
    return [];
  }
}

export async function getCollectionCampaign(id: string): Promise<CollectionCampaign | null> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/finance/collection-campaigns/${id}`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { data: CollectionCampaign };

    return payload.data;
  } catch {
    return null;
  }
}

export async function createCollectionCampaign(input: {
  name: string;
  description?: string;
  targetAmount?: number;
  compoundId?: string;
}): Promise<CollectionCampaign> {
  const response = await fetch(`${config.apiBaseUrl}/finance/collection-campaigns`, {
    body: JSON.stringify(input),
    headers: {
      ...(await apiHeaders(true)),
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to create collection campaign: ${response.status}`);
  }

  const payload = (await response.json()) as { data: CollectionCampaign };

  return payload.data;
}

export async function publishCollectionCampaign(id: string): Promise<CollectionCampaign> {
  const response = await fetch(`${config.apiBaseUrl}/finance/collection-campaigns/${id}/publish`, {
    headers: await apiHeaders(true),
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error(`Failed to publish collection campaign: ${response.status}`);
  }

  const payload = (await response.json()) as { data: CollectionCampaign };

  return payload.data;
}

export async function archiveCollectionCampaign(id: string): Promise<CollectionCampaign> {
  const response = await fetch(`${config.apiBaseUrl}/finance/collection-campaigns/${id}/archive`, {
    headers: await apiHeaders(true),
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error(`Failed to archive collection campaign: ${response.status}`);
  }

  const payload = (await response.json()) as { data: CollectionCampaign };

  return payload.data;
}

export async function applyCollectionCampaignCharges(
  id: string,
  input: {
    unitAccountIds: string[];
    amount: number;
    description: string;
  },
): Promise<{ count: number }> {
  const response = await fetch(`${config.apiBaseUrl}/finance/collection-campaigns/${id}/charges`, {
    body: JSON.stringify({
      unit_account_ids: input.unitAccountIds,
      amount: input.amount,
      description: input.description,
    }),
    headers: {
      ...(await apiHeaders(true)),
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to apply campaign charges: ${response.status}`);
  }

  const payload = (await response.json()) as { data: { count: number } };

  return payload.data;
}

export async function getFinanceReportSummary(): Promise<FinanceReportSummary | null> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/finance/reports/summary`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { data: FinanceReportSummary };

    return payload.data;
  } catch {
    return null;
  }
}

export async function getFinanceReportAccounts(
  filters: FinanceReportAccountsFilters = {},
): Promise<UnitAccount[]> {
  try {
    const params = new URLSearchParams();

    if (filters.balanceStatus && filters.balanceStatus !== "all") {
      params.set("balanceStatus", filters.balanceStatus);
    }

    if (filters.buildingId) {
      params.set("buildingId", filters.buildingId);
    }

    const query = params.toString();
    const response = await fetch(
      `${config.apiBaseUrl}/finance/reports/accounts${query ? `?${query}` : ""}`,
      {
        cache: "no-store",
        headers: await apiHeaders(true),
      },
    );

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as PaginatedEnvelope<UnitAccount>;

    return payload.data;
  } catch {
    return [];
  }
}

export async function getFinancePaymentMethodBreakdown(): Promise<FinancePaymentMethodRow[]> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/finance/reports/payment-methods`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as { data: FinancePaymentMethodRow[] };

    return payload.data;
  } catch {
    return [];
  }
}

// ─── Governance ───────────────────────────────────────────────────────────────

export async function getVotes(filters: VoteFilters = {}): Promise<Vote[]> {
  try {
    const params = new URLSearchParams();

    if (filters.status && filters.status !== "all") {
      params.set("status", filters.status);
    }

    if (filters.type && filters.type !== "all") {
      params.set("type", filters.type);
    }

    if (filters.compoundId) {
      params.set("compoundId", filters.compoundId);
    }

    const query = params.toString();
    const response = await fetch(`${config.apiBaseUrl}/governance/votes${query ? `?${query}` : ""}`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as PaginatedEnvelope<Vote>;

    return payload.data;
  } catch {
    return [];
  }
}

export async function getVote(voteId: string): Promise<Vote | null> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/governance/votes/${voteId}`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as ApiEnvelope<Vote>;

    return payload.data;
  } catch {
    return null;
  }
}

export async function createVote(input: CreateVoteInput): Promise<Vote> {
  const response = await fetch(`${config.apiBaseUrl}/governance/votes`, {
    body: JSON.stringify(input),
    headers: {
      ...(await apiHeaders(true)),
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to create vote: ${response.status}`);
  }

  const payload = (await response.json()) as ApiEnvelope<Vote>;

  return payload.data;
}

export async function activateVote(voteId: string): Promise<Vote> {
  const response = await fetch(`${config.apiBaseUrl}/governance/votes/${voteId}/activate`, {
    headers: await apiHeaders(true),
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to activate vote: ${response.status}`);
  }

  const payload = (await response.json()) as ApiEnvelope<Vote>;

  return payload.data;
}

export async function closeVote(voteId: string): Promise<Vote> {
  const response = await fetch(`${config.apiBaseUrl}/governance/votes/${voteId}/close`, {
    headers: await apiHeaders(true),
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to close vote: ${response.status}`);
  }

  const payload = (await response.json()) as ApiEnvelope<Vote>;

  return payload.data;
}

export async function cancelVote(voteId: string): Promise<Vote> {
  const response = await fetch(`${config.apiBaseUrl}/governance/votes/${voteId}/cancel`, {
    headers: await apiHeaders(true),
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to cancel vote: ${response.status}`);
  }

  const payload = (await response.json()) as ApiEnvelope<Vote>;

  return payload.data;
}

export async function getVoteEligibility(voteId: string): Promise<VoteEligibilityResult | null> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/governance/votes/${voteId}/eligibility`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as ApiEnvelope<VoteEligibilityResult>;

    return payload.data;
  } catch {
    return null;
  }
}

export async function castVote(voteId: string, optionId: number): Promise<void> {
  const response = await fetch(`${config.apiBaseUrl}/governance/votes/${voteId}/cast`, {
    body: JSON.stringify({ optionId }),
    headers: {
      ...(await apiHeaders(true)),
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to cast vote: ${response.status}`);
  }
}

// ─── Settings ────────────────────────────────────────────────────────────────

export async function getSettingsNamespaces(): Promise<string[]> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/settings`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });

    if (!response.ok) return [];

    const payload = (await response.json()) as { data: string[] };

    return payload.data;
  } catch {
    return [];
  }
}

export async function getSettings(namespace: string, compoundId?: string): Promise<SettingsNamespaceData | null> {
  try {
    const params = new URLSearchParams();
    if (compoundId) params.set("compoundId", compoundId);

    const qs = params.toString() ? `?${params.toString()}` : "";
    const response = await fetch(`${config.apiBaseUrl}/settings/${namespace}${qs}`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as { data: SettingsNamespaceData };

    return payload.data;
  } catch {
    return null;
  }
}

export async function updateSettings(namespace: string, input: UpdateSettingsInput): Promise<SettingsNamespaceData | null> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/settings/${namespace}`, {
      body: JSON.stringify(input),
      headers: {
        ...(await apiHeaders(true)),
        "Content-Type": "application/json",
      },
      method: "PATCH",
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as { data: SettingsNamespaceData };

    return payload.data;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Data Import
// ---------------------------------------------------------------------------

export async function getImportBatches(): Promise<ImportBatch[]> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/imports`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });

    if (!response.ok) return [];

    const payload = (await response.json()) as { data: ImportBatch[] };

    return payload.data;
  } catch {
    return [];
  }
}

export async function getImportBatch(id: string): Promise<ImportBatch | null> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/imports/${id}`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as ApiEnvelope<ImportBatch>;

    return payload.data;
  } catch {
    return null;
  }
}

export function getImportTemplateUrl(type: ImportBatchType): string {
  return `${config.apiBaseUrl}/imports/templates/${type}`;
}

// ── Advanced Finance: Reserve Funds ──────────────────────────────────────────

export async function getReserveFunds(): Promise<ReserveFund[]> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/finance/reserve-funds?per_page=50`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as PaginatedEnvelope<ReserveFund>;
    return payload.data ?? [];
  } catch {
    return [];
  }
}

export async function getReserveFund(id: string): Promise<ReserveFund | null> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/finance/reserve-funds/${id}`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as ApiEnvelope<ReserveFund>;
    return payload.data;
  } catch {
    return null;
  }
}

export async function getReserveFundMovements(id: string): Promise<ReserveFundMovement[]> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/finance/reserve-funds/${id}/movements?per_page=50`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as PaginatedEnvelope<ReserveFundMovement>;
    return payload.data ?? [];
  } catch {
    return [];
  }
}

// ── Advanced Finance: Vendors ─────────────────────────────────────────────────

export async function getVendors(): Promise<Vendor[]> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/finance/vendors?per_page=50`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as PaginatedEnvelope<Vendor>;
    return payload.data ?? [];
  } catch {
    return [];
  }
}

// ── Advanced Finance: Budgets ─────────────────────────────────────────────────

export async function getBudgets(): Promise<Budget[]> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/finance/budgets?per_page=50`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as PaginatedEnvelope<Budget>;
    return payload.data ?? [];
  } catch {
    return [];
  }
}

export async function getBudget(id: string): Promise<Budget | null> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/finance/budgets/${id}`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as ApiEnvelope<Budget>;
    return payload.data;
  } catch {
    return null;
  }
}

// ── Advanced Finance: Expenses ────────────────────────────────────────────────

export async function getExpenses(status?: string): Promise<Expense[]> {
  try {
    const params = new URLSearchParams({ per_page: "50" });
    if (status && status !== "all") params.set("status", status);
    const response = await fetch(`${config.apiBaseUrl}/finance/expenses?${params}`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as PaginatedEnvelope<Expense>;
    return payload.data ?? [];
  } catch {
    return [];
  }
}

export async function getExpense(id: string): Promise<Expense | null> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/finance/expenses/${id}`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as ApiEnvelope<Expense>;
    return payload.data;
  } catch {
    return null;
  }
}

// ── Online Payments ───────────────────────────────────────────────────────────

export async function getPaymentSessions(status?: string): Promise<PaymentSession[]> {
  try {
    const params = new URLSearchParams({ per_page: "50" });
    if (status) params.set("status", status);
    const response = await fetch(`${config.apiBaseUrl}/finance/payment-sessions?${params}`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as PaginatedEnvelope<PaymentSession>;
    return payload.data ?? [];
  } catch {
    return [];
  }
}

export async function getGatewayTransactions(): Promise<GatewayTransaction[]> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/finance/gateway-transactions?per_page=50`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as PaginatedEnvelope<GatewayTransaction>;
    return payload.data ?? [];
  } catch {
    return [];
  }
}

// ── Notification Channels ─────────────────────────────────────────────────────

export async function getNotificationTemplates(): Promise<NotificationTemplate[]> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/notification-templates`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as { data: NotificationTemplate[] };
    return payload.data ?? [];
  } catch {
    return [];
  }
}

export async function getNotificationDeliveryLogs(status?: string): Promise<NotificationDeliveryLog[]> {
  try {
    const params = new URLSearchParams({ per_page: "50" });
    if (status) params.set("status", status);
    const response = await fetch(`${config.apiBaseUrl}/notification-delivery-logs?${params}`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as PaginatedEnvelope<NotificationDeliveryLog>;
    return payload.data ?? [];
  } catch {
    return [];
  }
}

// ─── User support console (CM-79) ─────────────────────────────────────────────

export async function getUsers(filters: UserListFilters = {}): Promise<AuthenticatedUser[]> {
  try {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.status) params.set("status", filters.status);
    if (filters.role) params.set("role", filters.role);
    if (filters.perPage) params.set("perPage", String(filters.perPage));

    const query = params.toString();
    const response = await fetch(`${config.apiBaseUrl}/users${query ? `?${query}` : ""}`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as PaginatedEnvelope<AuthenticatedUser>;
    return payload.data ?? [];
  } catch {
    return [];
  }
}

export async function getUserSupportView(userId: number): Promise<UserSupportView | null> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/users/${userId}/support-view`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });
    if (!response.ok) return null;
    return (await response.json()) as UserSupportView;
  } catch {
    return null;
  }
}

export async function getUserDuplicates(userId: number): Promise<AuthenticatedUser[]> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/users/${userId}/duplicates`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as { candidates: AuthenticatedUser[] };
    return payload.candidates ?? [];
  } catch {
    return [];
  }
}

export async function getAccountMerges(): Promise<AccountMerge[]> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/account-merges`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as PaginatedEnvelope<AccountMerge>;
    return payload.data ?? [];
  } catch {
    return [];
  }
}

export async function getAccountMerge(mergeId: number): Promise<AccountMerge | null> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/account-merges/${mergeId}`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { data: AccountMerge };
    return payload.data;
  } catch {
    return null;
  }
}

// ─── Security operations (CM-81) ─────────────────────────────────────────────

export async function getSecurityGates(): Promise<SecurityGate[]> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/security/gates`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as { data: SecurityGate[] };
    return payload.data;
  } catch {
    return [];
  }
}

export async function getSecurityShifts(params: { status?: string } = {}): Promise<SecurityShift[]> {
  try {
    const qs = new URLSearchParams();
    if (params.status) qs.set("status", params.status);
    const query = qs.toString();
    const response = await fetch(`${config.apiBaseUrl}/security/shifts${query ? `?${query}` : ""}`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });
    if (!response.ok) return [];
    // shifts are paginated; data is nested one level deeper
    const payload = (await response.json()) as { data: { data: SecurityShift[] } };
    return payload.data.data;
  } catch {
    return [];
  }
}

export async function getSecurityDevices(): Promise<SecurityDevice[]> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/security/devices`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as { data: SecurityDevice[] };
    return payload.data;
  } catch {
    return [];
  }
}

export async function getSecurityIncidents(params: {
  shiftId?: string;
  gateId?: string;
  type?: string;
  from?: string;
  to?: string;
} = {}): Promise<SecurityIncident[]> {
  try {
    const qs = new URLSearchParams();
    if (params.shiftId) qs.set("shift_id", params.shiftId);
    if (params.gateId) qs.set("gate_id", params.gateId);
    if (params.type) qs.set("type", params.type);
    if (params.from) qs.set("from", params.from);
    if (params.to) qs.set("to", params.to);
    const query = qs.toString();
    const response = await fetch(`${config.apiBaseUrl}/security/incidents${query ? `?${query}` : ""}`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as { data: { data: SecurityIncident[] } };
    return payload.data.data;
  } catch {
    return [];
  }
}

export async function getManualVisitorEntries(params: {
  shiftId?: string;
  gateId?: string;
  status?: string;
  from?: string;
  to?: string;
} = {}): Promise<ManualVisitorEntry[]> {
  try {
    const qs = new URLSearchParams();
    if (params.shiftId) qs.set("shift_id", params.shiftId);
    if (params.gateId) qs.set("gate_id", params.gateId);
    if (params.status) qs.set("status", params.status);
    if (params.from) qs.set("from", params.from);
    if (params.to) qs.set("to", params.to);
    const query = qs.toString();
    const response = await fetch(`${config.apiBaseUrl}/security/manual-entries${query ? `?${query}` : ""}`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as { data: { data: ManualVisitorEntry[] } };
    return payload.data.data;
  } catch {
    return [];
  }
}

// ─── Operational analytics (CM-80) ────────────────────────────────────────────

export async function getOperationalAnalytics(filters: OperationalAnalyticsFilters = {}): Promise<OperationalAnalytics | null> {
  try {
    const params = new URLSearchParams();
    if (filters.buildingId) params.set("buildingId", filters.buildingId);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);

    const query = params.toString();
    const response = await fetch(`${config.apiBaseUrl}/analytics/operational${query ? `?${query}` : ""}`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { data: OperationalAnalytics };
    return payload.data;
  } catch {
    return null;
  }
}

// ─── Meetings (CM-82) ─────────────────────────────────────────────────────────

export async function getMeetings(params: {
  status?: string;
  scope?: string;
  from?: string;
  to?: string;
} = {}): Promise<Meeting[]> {
  try {
    const qs = new URLSearchParams();
    if (params.status && params.status !== "all") qs.set("status", params.status);
    if (params.scope) qs.set("scope", params.scope);
    if (params.from) qs.set("from", params.from);
    if (params.to) qs.set("to", params.to);
    const query = qs.toString();
    const response = await fetch(`${config.apiBaseUrl}/meetings${query ? `?${query}` : ""}`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as { data: { data: Meeting[] } };
    return payload.data.data;
  } catch {
    return [];
  }
}

export async function getMeeting(id: string): Promise<Meeting | null> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/meetings/${id}`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { data: Meeting };
    return payload.data;
  } catch {
    return null;
  }
}

export async function getMeetingActionItems(params: {
  status?: string;
  assignedTo?: string;
} = {}): Promise<MeetingActionItem[]> {
  try {
    const qs = new URLSearchParams();
    if (params.status && params.status !== "all") qs.set("status", params.status);
    if (params.assignedTo) qs.set("assigned_to", params.assignedTo);
    const query = qs.toString();
    const response = await fetch(`${config.apiBaseUrl}/meetings/action-items${query ? `?${query}` : ""}`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as { data: { data: MeetingActionItem[] } };
    return payload.data.data;
  } catch {
    return [];
  }
}

// ─── Work Orders (CM-83) ──────────────────────────────────────────────────────

export async function getWorkOrders(params: {
  status?: string;
  priority?: string;
  category?: string;
} = {}): Promise<WorkOrder[]> {
  try {
    const qs = new URLSearchParams();
    if (params.status && params.status !== "all") qs.set("status", params.status);
    if (params.priority) qs.set("priority", params.priority);
    if (params.category) qs.set("category", params.category);
    const query = qs.toString();
    const response = await fetch(`${config.apiBaseUrl}/work-orders${query ? `?${query}` : ""}`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as { data: { data: WorkOrder[] } };
    return payload.data.data;
  } catch {
    return [];
  }
}

export async function getWorkOrder(id: string): Promise<WorkOrder | null> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/work-orders/${id}`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { data: WorkOrder };
    return payload.data;
  } catch {
    return null;
  }
}

// ─── Privacy (CM-84) ──────────────────────────────────────────────────────────

export async function getDataExportRequests(): Promise<DataExportRequest[]> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/privacy/export-requests`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as { data: { data: DataExportRequest[] } };
    return payload.data.data;
  } catch {
    return [];
  }
}

// ─── Launch readiness (CM-127) ────────────────────────────────────────────────

export interface LaunchCheck {
  status: "pass" | "fail" | "warn";
  [key: string]: unknown;
}

export interface LaunchReadiness {
  overall: "ready" | "not_ready";
  timestamp: string;
  environment: string;
  infrastructure: Record<string, LaunchCheck>;
  launch: Record<string, LaunchCheck>;
  warnings: string[];
}

export async function getLaunchReadiness(): Promise<LaunchReadiness | null> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/system/launch-readiness`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { data: LaunchReadiness };
    return payload.data;
  } catch {
    return null;
  }
}

// ─── Localization (CM-85) ─────────────────────────────────────────────────────

export async function getLocaleSettings(): Promise<LocaleSettings | null> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/locale`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { data: LocaleSettings };
    return payload.data;
  } catch {
    return null;
  }
}

// --- RBAC ---

export interface RoleRecord {
  id: number;
  name: string;
  permissions: string[];
  users_count: number;
  is_system: boolean;
}

export interface PermissionRecord {
  id: number;
  name: string;
  roles_count: number;
  is_core: boolean;
}

export interface AdminScopeAssignment {
  id: number;
  role_name: string;
  scope_type: 'global' | 'compound' | 'building' | 'floor' | 'unit';
  scope_id: string | null;
  created_by: string | null;
  created_at: string;
}

export async function getRoles(): Promise<RoleRecord[]> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/roles`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as { data: RoleRecord[] };
    return payload.data;
  } catch {
    return [];
  }
}

export async function createRole(name: string, permissions: string[]): Promise<RoleRecord> {
  const response = await fetch(`${config.apiBaseUrl}/roles`, {
    body: JSON.stringify({ name, permissions }),
    headers: {
      ...(await apiHeaders(true)),
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Failed to create role: ${response.status}`);
  }
  const payload = (await response.json()) as { data: RoleRecord };
  return payload.data;
}

export async function updateRolePermissions(roleId: number, permissions: string[]): Promise<RoleRecord> {
  const response = await fetch(`${config.apiBaseUrl}/roles/${roleId}`, {
    body: JSON.stringify({ permissions }),
    headers: {
      ...(await apiHeaders(true)),
      "Content-Type": "application/json",
    },
    method: "PUT",
  });
  if (!response.ok) {
    throw new Error(`Failed to update role: ${response.status}`);
  }
  const payload = (await response.json()) as { data: RoleRecord };
  return payload.data;
}

export async function deleteRole(roleId: number): Promise<void> {
  const response = await fetch(`${config.apiBaseUrl}/roles/${roleId}`, {
    headers: await apiHeaders(true),
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`Failed to delete role: ${response.status}`);
  }
}

export async function getPermissions(): Promise<PermissionRecord[]> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/permissions`, {
      cache: "no-store",
      headers: await apiHeaders(true),
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as { data: PermissionRecord[] };
    return payload.data;
  } catch {
    return [];
  }
}

export async function createPermission(name: string): Promise<PermissionRecord> {
  const response = await fetch(`${config.apiBaseUrl}/permissions`, {
    body: JSON.stringify({ name }),
    headers: {
      ...(await apiHeaders(true)),
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Failed to create permission: ${response.status}`);
  }
  const payload = (await response.json()) as { data: PermissionRecord };
  return payload.data;
}

export async function deletePermission(permissionId: number): Promise<void> {
  const response = await fetch(`${config.apiBaseUrl}/permissions/${permissionId}`, {
    headers: await apiHeaders(true),
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`Failed to delete permission: ${response.status}`);
  }
}

export async function getUserRoleAssignments(userId: number): Promise<{
  spatie_roles: string[];
  scope_assignments: AdminScopeAssignment[];
}> {
  const response = await fetch(`${config.apiBaseUrl}/users/${userId}/role-assignments`, {
    cache: "no-store",
    headers: await apiHeaders(true),
  });
  if (!response.ok) {
    throw new Error(`Failed to get user role assignments: ${response.status}`);
  }
  const payload = (await response.json()) as { data: { spatie_roles: string[]; scope_assignments: AdminScopeAssignment[] } };
  return payload.data;
}

export async function assignUserRole(
  userId: number,
  roleName: string,
  scopeType: string,
  scopeId?: string | null,
): Promise<AdminScopeAssignment> {
  const response = await fetch(`${config.apiBaseUrl}/users/${userId}/role-assignments`, {
    body: JSON.stringify({ role_name: roleName, scope_type: scopeType, scope_id: scopeId ?? null }),
    headers: {
      ...(await apiHeaders(true)),
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Failed to assign user role: ${response.status}`);
  }
  const payload = (await response.json()) as { data: AdminScopeAssignment };
  return payload.data;
}

export async function revokeUserRole(userId: number, assignmentId: number): Promise<void> {
  const response = await fetch(`${config.apiBaseUrl}/users/${userId}/role-assignments/${assignmentId}`, {
    headers: await apiHeaders(true),
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`Failed to revoke user role: ${response.status}`);
  }
}

// ── Poll Types ────────────────────────────────────────────────────────────────

export async function getPollTypes(compoundId?: string): Promise<PollType[]> {
  const params = compoundId ? `?compoundId=${compoundId}` : "";
  const response = await fetch(`${config.apiBaseUrl}/polls/types${params}`, {
    cache: "no-store",
    headers: await apiHeaders(true),
  });
  if (!response.ok) return [];
  const json: ApiEnvelope<PollType[]> = await response.json();
  return json.data;
}

export async function createPollType(input: CreatePollTypeInput): Promise<PollType> {
  const response = await fetch(`${config.apiBaseUrl}/polls/types`, {
    method: "POST",
    headers: { ...(await apiHeaders(true)), "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error((err.message as string | undefined) ?? "Failed to create poll type");
  }
  const json: ApiEnvelope<PollType> = await response.json();
  return json.data;
}

export async function updatePollType(id: string, input: Partial<CreatePollTypeInput>): Promise<PollType> {
  const response = await fetch(`${config.apiBaseUrl}/polls/types/${id}`, {
    method: "PATCH",
    headers: { ...(await apiHeaders(true)), "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error((err.message as string | undefined) ?? "Failed to update poll type");
  }
  const json: ApiEnvelope<PollType> = await response.json();
  return json.data;
}

export async function deletePollType(id: string): Promise<void> {
  const response = await fetch(`${config.apiBaseUrl}/polls/types/${id}`, {
    method: "DELETE",
    headers: await apiHeaders(true),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error((err.message as string | undefined) ?? "Failed to delete poll type");
  }
}

// ── Polls ────────────────────────────────────────────────────────────────────

export async function getPolls(params?: { status?: PollStatus; compoundId?: string }): Promise<Poll[]> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.compoundId) qs.set("compoundId", params.compoundId);
  const query = qs.toString() ? `?${qs.toString()}` : "";
  const response = await fetch(`${config.apiBaseUrl}/polls${query}`, {
    cache: "no-store",
    headers: await apiHeaders(true),
  });
  if (!response.ok) return [];
  const json: PaginatedEnvelope<Poll> = await response.json();
  return json.data;
}

export async function getPoll(id: string): Promise<Poll | null> {
  const response = await fetch(`${config.apiBaseUrl}/polls/${id}`, {
    cache: "no-store",
    headers: await apiHeaders(true),
  });
  if (!response.ok) return null;
  const json: ApiEnvelope<Poll> = await response.json();
  return json.data;
}

export async function createPoll(input: CreatePollInput): Promise<Poll> {
  const response = await fetch(`${config.apiBaseUrl}/polls`, {
    method: "POST",
    headers: { ...(await apiHeaders(true)), "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error((err.message as string | undefined) ?? "Failed to create poll");
  }
  const json: ApiEnvelope<Poll> = await response.json();
  return json.data;
}

export async function publishPoll(id: string): Promise<Poll> {
  const response = await fetch(`${config.apiBaseUrl}/polls/${id}/publish`, {
    method: "POST",
    headers: await apiHeaders(true),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error((err.message as string | undefined) ?? "Failed to publish poll");
  }
  const json: ApiEnvelope<Poll> = await response.json();
  return json.data;
}

export async function closePoll(id: string): Promise<Poll> {
  const response = await fetch(`${config.apiBaseUrl}/polls/${id}/close`, {
    method: "POST",
    headers: await apiHeaders(true),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error((err.message as string | undefined) ?? "Failed to close poll");
  }
  const json: ApiEnvelope<Poll> = await response.json();
  return json.data;
}
