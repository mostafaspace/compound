export interface OrgChartRepresentativeLike {
  id: string;
  user: {
    id: number;
    name: string;
    email?: string | null;
    phone?: string | null;
    photoUrl?: string | null;
  };
  role: string;
  scopeLevel: "compound" | "building" | "floor";
  isActive: boolean;
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
