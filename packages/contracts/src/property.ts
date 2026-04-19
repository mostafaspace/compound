import type { AuthenticatedUser, UnitRelation, VerificationStatus } from "./platform";

export const compoundStatusValues = ["draft", "active", "suspended", "archived"] as const;

export type CompoundStatus = (typeof compoundStatusValues)[number];

export const unitStatusValues = ["active", "vacant", "blocked", "archived"] as const;

export type UnitStatus = (typeof unitStatusValues)[number];

export const unitTypeValues = ["apartment", "villa", "duplex", "retail", "office", "other"] as const;

export type UnitType = (typeof unitTypeValues)[number];

export interface CompoundSummary {
  id: string;
  name: string;
  legalName: string | null;
  code: string;
  timezone: string;
  currency: string;
  status: CompoundStatus;
  buildingsCount?: number;
  unitsCount?: number;
  createdAt: string | null;
  updatedAt: string | null;
  archivedAt?: string | null;
  archiveReason?: string | null;
}

export interface CompoundDetail extends CompoundSummary {
  buildings?: BuildingSummary[];
}

export interface BuildingSummary {
  id: string;
  compoundId: string;
  name: string;
  code: string;
  sortOrder: number;
  floorsCount?: number;
  unitsCount?: number;
  createdAt: string | null;
  updatedAt: string | null;
  archivedAt?: string | null;
  archiveReason?: string | null;
}

export interface BuildingDetail extends BuildingSummary {
  floors?: FloorSummary[];
  units?: UnitSummary[];
}

export interface FloorSummary {
  id: string;
  buildingId: string;
  label: string;
  levelNumber: number;
  sortOrder: number;
  unitsCount?: number;
  createdAt: string | null;
  updatedAt: string | null;
  archivedAt?: string | null;
  archiveReason?: string | null;
}

export interface UnitSummary {
  id: string;
  compoundId: string;
  buildingId: string;
  floorId: string | null;
  unitNumber: string;
  type: UnitType;
  areaSqm: string | null;
  bedrooms: number | null;
  status: UnitStatus;
  createdAt: string | null;
  updatedAt: string | null;
  memberships?: UnitMembership[];
  archivedAt?: string | null;
  archiveReason?: string | null;
}

export interface UnitDetail extends UnitSummary {
  memberships?: UnitMembership[];
}

export interface UnitMembership {
  id: number;
  unitId: string;
  userId: number;
  user?: AuthenticatedUser;
  relationType: UnitRelation;
  startsAt: string | null;
  endsAt: string | null;
  isPrimary: boolean;
  verificationStatus: VerificationStatus;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateCompoundInput {
  name: string;
  legalName?: string;
  code: string;
  timezone: string;
  currency: string;
}

export interface CreateBuildingInput {
  name: string;
  code: string;
  sortOrder?: number;
}

export interface CreateFloorInput {
  label: string;
  levelNumber: number;
  sortOrder?: number;
}

export interface CreateUnitInput {
  floorId?: string;
  unitNumber: string;
  type: UnitType;
  areaSqm?: number;
  bedrooms?: number;
  status?: UnitStatus;
}

export type UpdateCompoundInput = Partial<CreateCompoundInput> & {
  status?: CompoundStatus;
};

export type UpdateBuildingInput = Partial<CreateBuildingInput>;

export type UpdateFloorInput = Partial<CreateFloorInput>;

export type UpdateUnitInput = Partial<CreateUnitInput>;

export interface CreateUnitMembershipInput {
  userId: number;
  relationType: UnitRelation;
  startsAt?: string;
  endsAt?: string;
  isPrimary?: boolean;
  verificationStatus?: VerificationStatus;
}
