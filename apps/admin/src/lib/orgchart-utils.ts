export interface OrgChartRepresentativeLike {
  id: string;
  userId: number;
  user: {
    id: number;
    name: string;
    email?: string;
    phone?: string;
    photoUrl?: string | null;
  };
  role: string;
  scopeLevel: "compound" | "building" | "floor";
  contactVisibility: string;
  isActive: boolean;
}

export interface AssignableUserLike {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
}

export interface OrgChartPersonDetail {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  photo_url?: string | null;
  roles: string[];
  managed_scopes: Array<{
    role: string;
    scope: "compound" | "building" | "floor";
    building_id: string | null;
    floor_id: string | null;
  }>;
}

export interface OrgChartUnitLike {
  id: string;
  unitNumber: string;
  residents: Array<{
    id: number;
    name: string;
    photoUrl?: string | null;
  }>;
}

export interface OrgChartFloorLike {
  id: string;
  label: string;
  representatives: OrgChartRepresentativeLike[];
  units?: OrgChartUnitLike[];
}

export interface OrgChartBuildingLike {
  id: string;
  name: string;
  code?: string;
  representatives: OrgChartRepresentativeLike[];
  floors?: OrgChartFloorLike[];
}

export interface OrgChartResponseLike {
  compound: {
    id: string;
    name: string;
    code?: string;
    representatives: OrgChartRepresentativeLike[];
  };
  buildings?: OrgChartBuildingLike[];
}

export interface OrgChartTreeNodeLike {
  id: string;
  type: "compound" | "building" | "floor";
  label: string;
  code?: string;
  representatives: OrgChartRepresentativeLike[];
  children: OrgChartTreeNodeLike[];
  units?: OrgChartUnitLike[];
}

function normalizeList<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  if ("data" in value) {
    return normalizeList<T>((value as { data?: unknown }).data);
  }

  return Object.values(value as Record<string, T>);
}

function normalizeRepresentative(value: unknown, index: number): OrgChartRepresentativeLike {
  const representative = (value && typeof value === "object" ? value : {}) as Partial<OrgChartRepresentativeLike> & {
    roleKey?: string;
    contactVisibilityKey?: string;
    user?: Partial<OrgChartRepresentativeLike["user"]> | null;
  };

  const user = (representative.user ?? {}) as Partial<OrgChartRepresentativeLike["user"]>;
  const userId = typeof representative.userId === "number"
    ? representative.userId
    : typeof user.id === "number"
      ? user.id
      : 0;

  return {
    id: representative.id ?? `rep_${userId || index}`,
    userId,
    user: {
      id: typeof user.id === "number" ? user.id : userId,
      name: user.name ?? `User #${userId || index + 1}`,
      email: user.email ?? undefined,
      phone: user.phone ?? undefined,
      photoUrl: user.photoUrl ?? null,
    },
    role: representative.role ?? representative.roleKey ?? "association_member",
    scopeLevel: representative.scopeLevel ?? "compound",
    contactVisibility: representative.contactVisibility ?? representative.contactVisibilityKey ?? "admins_only",
    isActive: representative.isActive ?? true,
  };
}

function normalizeRepresentatives(value: unknown): OrgChartRepresentativeLike[] {
  return normalizeList<unknown>(value).map(normalizeRepresentative);
}

export function mergeRepresentativeWithPersonDetail<T extends OrgChartRepresentativeLike>(
  representative: T,
  detail: OrgChartPersonDetail | null,
): T {
  if (!detail) {
    return representative;
  }

  return {
    ...representative,
    user: {
      ...representative.user,
      email: detail.email ?? representative.user.email,
      phone: detail.phone ?? representative.user.phone,
      photoUrl: detail.photo_url ?? representative.user.photoUrl ?? null,
    },
  };
}

export function parseAssignmentUserId(value: string): number | null {
  const trimmed = value.trim();

  if (!/^\d+$/.test(trimmed)) {
    return null;
  }

  const parsed = Number.parseInt(trimmed, 10);

  return parsed > 0 ? parsed : null;
}

export function buildOrgChartTree(data: OrgChartResponseLike): OrgChartTreeNodeLike {
  return {
    id: data.compound.id,
    type: "compound",
    label: data.compound.name,
    code: data.compound.code,
    representatives: normalizeRepresentatives(data.compound.representatives),
    children: normalizeList<OrgChartBuildingLike>(data.buildings).map((building) => ({
      id: building.id,
      type: "building",
      label: building.name,
      code: building.code,
      representatives: normalizeRepresentatives(building.representatives),
      children: normalizeList<OrgChartFloorLike>(building.floors).map((floor) => ({
        id: floor.id,
        type: "floor",
        label: floor.label,
        representatives: normalizeRepresentatives(floor.representatives),
        units: normalizeList<OrgChartUnitLike>(floor.units),
        children: [],
      })),
    })),
  };
}

export function formatAssignableUserLabel(user: AssignableUserLike): string {
  const secondary = user.email || user.phone;
  return secondary ? `${user.name} (${secondary})` : user.name;
}
