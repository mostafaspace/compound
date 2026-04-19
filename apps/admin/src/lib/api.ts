import "server-only";

import type {
  ApiEnvelope,
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
  DocumentStatus,
  DocumentType,
  FloorSummary,
  ResidentInvitation,
  LoginInput,
  LoginResult,
  PaginatedEnvelope,
  UnitDetail,
  UnitSummary,
  UpdateBuildingInput,
  UpdateCompoundInput,
  UpdateFloorInput,
  UpdateUnitInput,
  UserDocument,
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
