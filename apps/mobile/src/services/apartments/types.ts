export type ApiEnvelope<T> = {
  data: T;
};

export type PaginatedEnvelope<T> = {
  data: T[];
  links?: unknown;
  meta?: unknown;
};

export type ApartmentUnit = {
  id: string;
  compoundId: string;
  buildingId: string | null;
  floorId: string | null;
  unitNumber: string;
  type: string;
  areaSqm: number | string | null;
  bedrooms: number | null;
  status: string;
  hasVehicle: boolean;
  hasParking: boolean;
};

export type ApartmentSummary = {
  id: string;
  unit: ApartmentUnit;
  residents?: ApartmentResident[];
  vehicles?: ApartmentVehicle[];
  parkingSpots?: ApartmentParkingSpot[];
  violationsSummary?: ApartmentViolationsSummary;
  recentNotes?: ApartmentNote[];
  documents?: ApartmentDocument[];
  finance?: ApartmentFinanceSummary;
};

export type ApartmentResident = {
  id: number;
  unitId: string;
  userId: number | null;
  relationType: string;
  startsAt: string | null;
  endsAt: string | null;
  isPrimary: boolean;
  verificationStatus: string;
  residentName: string | null;
  residentPhone: string | null;
  phonePublic: boolean;
  residentEmail: string | null;
  emailPublic: boolean;
  photoPath: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ApartmentVehicle = {
  id: number;
  unitId: string;
  apartmentResidentId: number | null;
  plate: string;
  make: string | null;
  model: string | null;
  color: string | null;
  stickerCode: string | null;
  notes: string | null;
  createdBy: number | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ApartmentParkingSpot = {
  id: number;
  unitId: string;
  code: string;
  notes: string | null;
  createdBy: number | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ApartmentViolation = {
  id: number;
  unitId: string;
  violationRuleId: number;
  rule?: ViolationRule;
  appliedBy: number;
  fee: string;
  notes: string | null;
  status: "pending" | "paid" | "waived";
  paidAt: string | null;
  waivedReason: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ViolationRule = {
  id: number;
  compoundId: string;
  name: string;
  nameAr: string | null;
  description: string | null;
  defaultFee: string;
  isActive: boolean;
  createdBy: number;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ApartmentViolationsSummary = {
  count: number;
  total: string;
};

export type ApartmentNote = {
  id: number;
  unitId: string;
  authorId: number;
  author?: {
    id: number;
    name: string;
  };
  body: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ApartmentDocument = {
  id: number;
  unitId: string;
  uploadedByUserId: number;
  documentType: string;
  filePath: string;
  mimeType: string | null;
  sizeBytes: number | null;
  status: "active" | "archived";
  version: number;
  replacedById: number | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ApartmentFinanceSummary = {
  account: unknown | null;
  outstandingEntries: unknown[];
};

export type ApartmentDetail = Required<ApartmentSummary>;

export type UploadFile = {
  uri: string;
  name: string;
  type: string;
};
