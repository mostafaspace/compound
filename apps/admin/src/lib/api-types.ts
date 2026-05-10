export type VehicleLookupResult = {
  source: "apartment_vehicle" | "visitor_request";
  vehicleId: number | string;
  plate: string;
  stickerCode: string | null;
  make: string | null;
  model: string | null;
  color: string | null;
  unit: { id: string | null; unitNumber: string | null; buildingName: string | null };
  residents: Array<{ id: number | null; name: string; phone: string | null; email: string | null }>;
};

export type ApartmentPenaltyEvent = {
  id: number;
  unitId: string;
  violationRuleId: number | null;
  points: number;
  reason: string;
  notes: string | null;
  expiresAt: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  createdAt: string | null;
};

export type AdminSecurityFlag = {
  id: number;
  type: string;
  severity: "info" | "warning" | "critical";
  status: "open" | "reviewed" | "dismissed";
  summary: string;
  user?: { id: number; name: string; email: string };
  createdAt: string | null;
};

export type AdminSession = {
  id: number;
  ipAddress: string;
  userAgent: string;
  deviceLabel: string | null;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  revokedAt: string | null;
};

export type AnnouncementTargetPreview = {
  recipientCount: number;
};
