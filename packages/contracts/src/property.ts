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
