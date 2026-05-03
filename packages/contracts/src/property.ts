import type { AuthenticatedUser, UnitRelation, VerificationStatus } from "./platform";

export const compoundStatusValues = ["draft", "active", "suspended", "archived"] as const;

export type CompoundStatus = (typeof compoundStatusValues)[number];
 
export const unitStatusValues = ["active", "vacant", "blocked", "archived"] as const;

export type UnitStatus = (typeof unitStatusValues)[number];

export const unitTypeValues = ["apartment", "studio", "villa", "duplex", "retail", "office", "other"] as const;

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
  compound?: CompoundSummary | null;
  buildingId: string;
  building?: BuildingSummary | null;
  floorId: string | null;
  floor?: FloorSummary | null;
  unitNumber: string;
  type?: UnitType;
  areaSqm?: string | number | null;
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
  unit?: UnitSummary | null;
  userId: number;
  user?: AuthenticatedUser;
  relationType: UnitRelation;
  startsAt: string | null;
  endsAt: string | null;
  isPrimary: boolean;
  verificationStatus: VerificationStatus;
  residentName: string | null;
  residentPhone: string | null;
  phonePublic: boolean;
  residentEmail: string | null;
  emailPublic: boolean;
  hasVehicle: boolean;
  vehiclePlate: string | null;
  parkingSpotCode: string | null;
  garageStickerCode: string | null;
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
  residentName?: string;
  residentPhone?: string;
  phonePublic?: boolean;
  residentEmail?: string;
  emailPublic?: boolean;
  hasVehicle?: boolean;
  vehiclePlate?: string;
  parkingSpotCode?: string;
  garageStickerCode?: string;
}
