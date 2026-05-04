import type { AuthenticatedUser } from "./platform";

export const issueStatusValues = [
  "new",
  "in_progress",
  "escalated",
  "resolved",
  "closed"
] as const;

export type IssueStatus = (typeof issueStatusValues)[number];

export const visitorPassStatusValues = ["active", "used", "expired", "revoked"] as const;

export type VisitorPassStatus = (typeof visitorPassStatusValues)[number];

export const visitorRequestStatusValues = [
  "pending",
  "qr_issued",
  "arrived",
  "allowed",
  "denied",
  "completed",
  "cancelled"
] as const;

export type VisitorRequestStatus = (typeof visitorRequestStatusValues)[number];

export const visitorScanResultValues = [
  "valid",
  "expired",
  "already_used",
  "denied",
  "cancelled",
  "not_found",
  "out_of_window"
] as const;

export type VisitorScanResult = (typeof visitorScanResultValues)[number];

export interface VisitorPass {
  id: string;
  visitorRequestId: string;
  status: VisitorPassStatus;
  expiresAt: string | null;
  maxUses: number;
  usesCount: number;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface VisitorUnitSummary {
  id: string;
  compoundId: string;
  buildingId: string;
  floorId: string | null;
  unitNumber: string;
  buildingName?: string | null;
  compoundName?: string | null;
}

export interface VisitorRequest {
  id: string;
  hostUserId: number;
  host?: AuthenticatedUser;
  unitId: string;
  unit?: VisitorUnitSummary | null;
  visitorName: string;
  visitorPhone: string | null;
  vehiclePlate: string | null;
  visitStartsAt: string | null;
  visitEndsAt: string | null;
  notes: string | null;
  pictureUrl: string | null;
  numberOfVisitors: number | null;
  status: VisitorRequestStatus;
  pass?: VisitorPass | null;
  qrToken?: string;
  arrivedAt: string | null;
  allowedAt: string | null;
  deniedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  decisionReason: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateVisitorRequestInput {
  unitId: string;
  visitorName: string;
  visitorPhone?: string;
  vehiclePlate?: string;
  visitStartsAt: string;
  visitEndsAt: string;
  notes?: string;
  pictureUrl?: string;
  numberOfVisitors?: number;
}

export interface VisitorDecisionInput {
  reason?: string;
}

export interface VisitorPassValidationResult {
  result: VisitorScanResult;
  visitorRequest: VisitorRequest | null;
}

export const representativeRoleValues = [
  "floor_representative",
  "building_representative",
  "association_member",
  "president",
  "treasurer",
  "security_contact",
  "admin_contact"
] as const;

export type RepresentativeRole = (typeof representativeRoleValues)[number];

export const contactVisibilityValues = [
  "all_residents",
  "building_residents",
  "floor_residents",
  "admins_only"
] as const;

export type ContactVisibility = (typeof contactVisibilityValues)[number];

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
  compoundId?: string;
  buildingId?: string | null;
  floorId?: string | null;
  userId: number;
  user: {
    id: number;
    name: string;
    email?: string | null;
    phone?: string | null;
    photoUrl?: string | null;
  };
  role: RepresentativeRole;
  scopeLevel: "compound" | "building" | "floor";
  contactVisibility: ContactVisibility;
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
