import "server-only";

import type {
  ApiEnvelope,
  BuildingDetail,
  BuildingSummary,
  CompoundDetail,
  AuthenticatedUser,
  CompoundSummary,
  CreateBuildingInput,
  CreateCompoundInput,
  CreateFloorInput,
  CreateUnitInput,
  FloorSummary,
  LoginInput,
  LoginResult,
  PaginatedEnvelope,
  UnitSummary,
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
