import "server-only";

import type {
  ApiEnvelope,
  AuditLogEntry,
  AuditLogFilters,
  BuildingDetail,
  BuildingSummary,
  CompoundDetail,
  AuthenticatedUser,
  CreateResidentInvitationInput,
  CompoundSummary,
  CreateBuildingInput,
  CreateCompoundInput,
  CreateFloorInput,
  CreateUnitMembershipInput,
  CreateUnitInput,
  CreateVisitorRequestInput,
  DocumentStatus,
  DocumentType,
  FloorSummary,
  InvitationStatus,
  ResidentInvitation,
  LoginInput,
  LoginResult,
  NotificationCategory,
  NotificationPreference,
  PaginatedEnvelope,
  UnitDetail,
  UnitSummary,
  UpdateBuildingInput,
  UpdateCompoundInput,
  UpdateFloorInput,
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

export async function getAuditLogs(input: AuditLogFilters = {}): Promise<AuditLogEntry[]> {
  try {
    const params = new URLSearchParams();

    if (input.action) {
      params.set("action", input.action);
    }

    if (input.actorId) {
      params.set("actorId", String(input.actorId));
    }

    if (input.from) {
      params.set("from", input.from);
    }

    if (input.method) {
      params.set("method", input.method);
    }

    if (input.perPage) {
      params.set("perPage", String(input.perPage));
    }

    if (input.q) {
      params.set("q", input.q);
    }

    if (input.to) {
      params.set("to", input.to);
    }

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
