import type { AssignableUserLike, OrgChartPersonDetail, OrgChartRepresentativeLike } from "./orgchart-utils";
export { buildOrgChartTree, formatAssignableUserLabel, mergeRepresentativeWithPersonDetail, parseAssignmentUserId } from "./orgchart-utils";

// Type definitions (will be moved to @compound/contracts later)
export type RepresentativeRole =
  | "floor_representative"
  | "building_representative"
  | "association_member"
  | "president"
  | "treasurer"
  | "security_contact"
  | "admin_contact";

export type ContactVisibility = "all_residents" | "building_residents" | "floor_residents" | "admins_only";

export interface RepresentativeAssignment {
  id: string;
  compoundId: string;
  buildingId: string | null;
  floorId: string | null;
  userId: number;
  user?: { id: number; name: string };
  role: RepresentativeRole;
  scopeLevel: "compound" | "building" | "floor";
  startsAt: string;
  endsAt: string | null;
  isActive: boolean;
  contactVisibility: ContactVisibility;
  appointedBy: number | null;
  appointedByUser?: { id: number; name: string };
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRepresentativeAssignmentInput {
  userId: number;
  role: RepresentativeRole;
  buildingId?: string;
  floorId?: string;
  startsAt: string;
  endsAt?: string;
  contactVisibility?: ContactVisibility;
  notes?: string;
}

export interface UpdateRepresentativeAssignmentInput {
  contactVisibility?: ContactVisibility;
  notes?: string;
  startsAt?: string;
}

export interface OrgChartRepresentative {
  id: string;
  compoundId?: string;
  buildingId?: string | null;
  floorId?: string | null;
  userId: number;
  user: { 
    id: number; 
    name: string; 
    email?: string;
    phone?: string;
    photoUrl?: string | null 
  };
  role: RepresentativeRole;
  scopeLevel: "compound" | "building" | "floor";
  contactVisibility: ContactVisibility;
  isActive: boolean;
}

export type OrgChartRepresentativeSnapshot = OrgChartRepresentativeLike;
export type { OrgChartPersonDetail };
export interface OrgChartAssignableUser extends AssignableUserLike {}

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

export interface OrgChartCompound {
  id: string;
  name: string;
  code: string;
  representatives: OrgChartRepresentative[];
}

export interface OrgChartResponse {
  compound: OrgChartCompound;
  buildings: OrgChartBuilding[];
}

export interface ResponsiblePartyResponse {
  unit: { id: string; unitNumber: string };
  floorRepresentative: OrgChartRepresentative | null;
  buildingRepresentative: OrgChartRepresentative | null;
  associationContacts: OrgChartRepresentative[];
}

export interface ListRepresentativesFilters {
  role?: RepresentativeRole;
  active?: boolean;
  buildingId?: string;
  floorId?: string;
}
