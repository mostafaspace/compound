"use server";

import type { ApiEnvelope, PaginatedEnvelope } from "@compound/contracts";

import { config } from "./config";
import { getAuthToken } from "./session";
import type {
  RepresentativeAssignment,
  CreateRepresentativeAssignmentInput,
  UpdateRepresentativeAssignmentInput,
  OrgChartResponse,
  ResponsiblePartyResponse,
  ListRepresentativesFilters,
} from "./orgchart";

async function apiHeaders(authenticated = true): Promise<Record<string, string>> {
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

export async function getCompoundOrgChart(compoundId: string): Promise<OrgChartResponse | null> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/compounds/${compoundId}/org-chart`, {
      cache: "no-store",
      headers: await apiHeaders(),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as ApiEnvelope<OrgChartResponse>;

    return payload.data;
  } catch {
    return null;
  }
}

export async function getResponsibleParty(unitId: string): Promise<ResponsiblePartyResponse | null> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/units/${unitId}/responsible-party`, {
      cache: "no-store",
      headers: await apiHeaders(),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as ApiEnvelope<ResponsiblePartyResponse>;

    return payload.data;
  } catch {
    return null;
  }
}

export async function listRepresentativeAssignments(
  compoundId: string,
  filters: ListRepresentativesFilters = {},
): Promise<RepresentativeAssignment[]> {
  try {
    const params = new URLSearchParams();

    if (filters.role) {
      params.set("role", filters.role);
    }

    if (filters.active !== undefined) {
      params.set("active", filters.active ? "true" : "false");
    }

    if (filters.buildingId) {
      params.set("buildingId", filters.buildingId);
    }

    if (filters.floorId) {
      params.set("floorId", filters.floorId);
    }

    const query = params.toString();
    const response = await fetch(`${config.apiBaseUrl}/compounds/${compoundId}/representatives${query ? `?${query}` : ""}`, {
      cache: "no-store",
      headers: await apiHeaders(),
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as ApiEnvelope<RepresentativeAssignment[]>;

    return payload.data;
  } catch {
    return [];
  }
}

export async function createRepresentativeAssignment(
  compoundId: string,
  input: CreateRepresentativeAssignmentInput,
): Promise<RepresentativeAssignment> {
  const response = await fetch(`${config.apiBaseUrl}/compounds/${compoundId}/representatives`, {
    body: JSON.stringify(input),
    headers: {
      ...(await apiHeaders()),
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to create representative assignment: ${response.status}`);
  }

  const payload = (await response.json()) as ApiEnvelope<RepresentativeAssignment>;

  return payload.data;
}

export async function getRepresentativeAssignment(assignmentId: string): Promise<RepresentativeAssignment | null> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/representative-assignments/${assignmentId}`, {
      cache: "no-store",
      headers: await apiHeaders(),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as ApiEnvelope<RepresentativeAssignment>;

    return payload.data;
  } catch {
    return null;
  }
}

export async function updateRepresentativeAssignment(
  assignmentId: string,
  input: UpdateRepresentativeAssignmentInput,
): Promise<RepresentativeAssignment> {
  const response = await fetch(`${config.apiBaseUrl}/representative-assignments/${assignmentId}`, {
    body: JSON.stringify(input),
    headers: {
      ...(await apiHeaders()),
      "Content-Type": "application/json",
    },
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error(`Failed to update representative assignment: ${response.status}`);
  }

  const payload = (await response.json()) as ApiEnvelope<RepresentativeAssignment>;

  return payload.data;
}

export async function expireRepresentativeAssignment(assignmentId: string): Promise<RepresentativeAssignment> {
  const response = await fetch(`${config.apiBaseUrl}/representative-assignments/${assignmentId}/expire`, {
    headers: await apiHeaders(),
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to expire representative assignment: ${response.status}`);
  }

  const payload = (await response.json()) as ApiEnvelope<RepresentativeAssignment>;

  return payload.data;
}

export async function listAllRepresentativeAssignments(
  filters: ListRepresentativesFilters = {},
): Promise<RepresentativeAssignment[]> {
  try {
    // The API requires a compound scope; fetch the first compound's assignments.
    // In a single-compound setup this covers all assignments.
    const compoundsResponse = await fetch(`${config.apiBaseUrl}/compounds`, {
      cache: "no-store",
      headers: await apiHeaders(),
    });

    if (!compoundsResponse.ok) {
      return [];
    }

    const compoundsPayload = (await compoundsResponse.json()) as PaginatedEnvelope<{ id: string }>;
    const compoundIds = compoundsPayload.data.map((c) => c.id);

    if (compoundIds.length === 0) {
      return [];
    }

    const params = new URLSearchParams();

    if (filters.role) {
      params.set("role", filters.role);
    }

    if (filters.active !== undefined) {
      params.set("active", filters.active ? "true" : "false");
    }

    if (filters.buildingId) {
      params.set("buildingId", filters.buildingId);
    }

    if (filters.floorId) {
      params.set("floorId", filters.floorId);
    }

    const query = params.toString();

    const results = await Promise.all(
      compoundIds.map(async (compoundId) => {
        const response = await fetch(
          `${config.apiBaseUrl}/compounds/${compoundId}/representatives${query ? `?${query}` : ""}`,
          {
            cache: "no-store",
            headers: await apiHeaders(),
          },
        );

        if (!response.ok) {
          return [] as RepresentativeAssignment[];
        }

        const payload = (await response.json()) as ApiEnvelope<RepresentativeAssignment[]>;

        return payload.data;
      }),
    );

    return results.flat();
  } catch {
    return [];
  }
}
