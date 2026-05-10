interface RoleLike {
  roles?: string[];
}

interface AdminSection {
  href: string;
  label: string;
  group: "operate" | "community" | "govern" | "secure" | "system";
}

function hasRole(user: RoleLike, role: string): boolean {
  return user.roles?.includes(role) ?? false;
}

export function getCompoundAdminLoginDestination(): string {
  return "/";
}

export function shouldShowCompoundContext(user: RoleLike): boolean {
  return hasRole(user, "super_admin");
}

export function getAdminSections(user: RoleLike): AdminSection[] {
  const isSuperAdmin = hasRole(user, "super_admin");
  const sections: AdminSection[] = [
    { href: "/", label: "Command Center", group: "operate" },
    { href: "/units/assign", label: "Apartments", group: "operate" },
    { href: "/vehicles", label: "Vehicles", group: "operate" },
    { href: "/finance", label: "Finance", group: "operate" },
    { href: "/announcements", label: "Communications", group: "community" },
    { href: "/polls", label: "Polls", group: "govern" },
    { href: "/security", label: "Security", group: "secure" },
    { href: "/security/admin-activity", label: "Admin Activity", group: "secure" },
    { href: "/audit-logs", label: "Audit", group: "secure" },
    { href: "/settings", label: "Settings", group: "system" },
  ];

  if (isSuperAdmin) {
    sections.splice(1, 0, { href: "/compounds", label: "Compounds", group: "operate" });
  }

  return sections;
}
