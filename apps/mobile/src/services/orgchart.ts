import { api } from "./api";
import type { ApiEnvelope } from "@compound/contracts";

// Local types — mirror the backend OrgChartController response
export interface OrgChartUser {
  id: number;
  name: string;
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

export interface OrgChartFloor {
  id: string;
  label: string;
  levelNumber: number;
  representatives: OrgChartRepresentative[];
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

export const orgChartApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getOrgChart: builder.query<OrgChartResponse, string>({
      query: (compoundId) => `/compounds/${compoundId}/org-chart`,
      transformResponse: (response: ApiEnvelope<OrgChartResponse>) => response.data,
    }),
  }),
});

export const { useGetOrgChartQuery } = orgChartApi;
