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
  userId: number;
  user: { id: number; name: string };
  role: RepresentativeRole;
  scopeLevel: "compound" | "building" | "floor";
  contactVisibility: ContactVisibility;
  isActive: boolean;
}

export interface OrgChartBuilding {
  id: string;
  name: string;
  code: string;
  representatives: OrgChartRepresentative[];
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

// Re-export server actions
export {
  getCompoundOrgChart,
  getResponsibleParty,
  listRepresentativeAssignments,
  listAllRepresentativeAssignments,
  createRepresentativeAssignment,
  getRepresentativeAssignment,
  updateRepresentativeAssignment,
  expireRepresentativeAssignment,
} from "./orgchart-actions";
