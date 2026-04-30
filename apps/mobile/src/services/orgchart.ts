import { api } from "./api";
import type { ApiEnvelope } from "@compound/contracts";

// Local types — mirror the backend OrgChartController response
export interface OrgChartUser {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  photoUrl?: string | null;
}

export interface OrgChartRepresentative {
  id: string;
  userId: number;
  user: OrgChartUser;
  role: string;
  scopeLevel: "compound" | "building" | "floor";
  isActive: boolean;
}

export interface OrgChartResident {
  id: number;
  name: string;
  photoUrl?: string | null;
}

export interface OrgChartUnit {
  id: string;
  unitNumber: string;
  residents: OrgChartResident[];
}

export interface OrgChartFloor {
  id: string;
  label: string;
  representatives: OrgChartRepresentative[];
  units: OrgChartUnit[];
}

export interface OrgChartBuilding {
  id: string;
  name: string;
  code: string;
  representatives: OrgChartRepresentative[];
  floors: OrgChartFloor[];
}

export interface OrgChartResponse {
  compound: {
    id: string;
    name: string;
    code: string;
    representatives: OrgChartRepresentative[];
  };
  buildings: OrgChartBuilding[];
}

export interface OrgChartPersonDetail {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  photo_url?: string | null;
  roles: string[];
  managed_scopes: Array<{
    role: string;
    scope: "compound" | "building" | "floor";
    building_id: string | null;
    floor_id: string | null;
  }>;
}

export const orgChartApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getOrgChart: builder.query<OrgChartResponse, string>({
      query: (compoundId) => `/compounds/${compoundId}/org-chart`,
      transformResponse: (response: ApiEnvelope<OrgChartResponse>) => response.data,
    }),
    getOrgChartPersonDetail: builder.query<OrgChartPersonDetail, number>({
      query: (userId) => `/org-chart/person/${userId}`,
      transformResponse: (response: ApiEnvelope<OrgChartPersonDetail>) => response.data,
    }),
  }),
});

export const { useGetOrgChartQuery, useLazyGetOrgChartPersonDetailQuery } = orgChartApi;
