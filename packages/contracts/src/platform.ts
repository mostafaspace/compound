export const userRoleValues = [
  "super_admin",
  "compound_admin",
  "board_member",
  "finance_reviewer",
  "security_guard",
  "resident_owner",
  "resident_tenant",
  "support_agent"
] as const;

export type UserRole = (typeof userRoleValues)[number];

export const unitRelationValues = ["owner", "tenant", "resident", "representative"] as const;

export type UnitRelation = (typeof unitRelationValues)[number];

export const verificationStatusValues = ["pending", "verified", "rejected", "expired"] as const;

export type VerificationStatus = (typeof verificationStatusValues)[number];

export const verificationRequestStatusValues = ["pending_review", "more_info_requested", "approved", "rejected"] as const;

export type VerificationRequestStatus = (typeof verificationRequestStatusValues)[number];

export const invitationStatusValues = ["pending", "accepted", "revoked", "expired"] as const;

export type InvitationStatus = (typeof invitationStatusValues)[number];

export interface ApiEnvelope<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface PaginatedEnvelope<T> extends ApiEnvelope<T[]> {
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number | null;
    last_page: number;
    per_page: number;
    to: number | null;
    total: number;
  };
}

export interface AuthenticatedUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: "invited" | "pending_review" | "active" | "suspended" | "archived";
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
}

export interface InvitationUnitSummary {
  id: string;
  compoundId: string;
  buildingId: string;
  floorId: string | null;
  unitNumber: string;
}

export interface ResidentInvitation {
  id: number;
  email: string;
  role: UserRole;
  relationType: UnitRelation | null;
  status: InvitationStatus;
  expiresAt: string | null;
  acceptedAt: string | null;
  revokedAt: string | null;
  lastSentAt: string | null;
  deliveryCount: number;
  user?: AuthenticatedUser;
  unit?: InvitationUnitSummary | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateResidentInvitationInput {
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  unitId?: string;
  relationType?: UnitRelation;
  startsAt?: string;
  isPrimary?: boolean;
  expiresAt?: string;
}

export interface AcceptResidentInvitationInput {
  name: string;
  phone?: string;
  password: string;
  password_confirmation: string;
}

export interface VerificationRequest {
  id: number;
  userId: number;
  user?: AuthenticatedUser;
  residentInvitationId: number | null;
  residentInvitation?: ResidentInvitation | null;
  unitId: string | null;
  unit?: InvitationUnitSummary | null;
  requestedRole: UserRole;
  relationType: UnitRelation | null;
  status: VerificationRequestStatus;
  submittedAt: string | null;
  reviewedBy: number | null;
  reviewer?: AuthenticatedUser | null;
  reviewedAt: string | null;
  decisionNote: string | null;
  moreInfoNote: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ReviewVerificationRequestInput {
  note?: string;
}

export interface LoginInput {
  email: string;
  password: string;
  deviceName: string;
}

export interface LoginResult {
  token: string;
  tokenType: "Bearer";
  user: AuthenticatedUser;
}
