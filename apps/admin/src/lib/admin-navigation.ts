interface RoleLike {
  roles?: string[];
  permissions?: string[];
}

export type AdminSectionGroup = "operate" | "community" | "govern" | "secure" | "system";

export interface AdminSection {
  href: string;
  labelKey: string;
  group: AdminSectionGroup;
  icon: string;
  keywords: string[];
  parentHref?: string;
  requiredPermission?: string;
  requiredRole?: string;
  sidebar?: boolean;
}

function hasRole(user: RoleLike, role: string): boolean {
  return user.roles?.includes(role) ?? false;
}

function hasPermission(user: RoleLike, permission: string): boolean {
  if (hasRole(user, "super_admin")) return true;
  return user.permissions?.includes(permission) ?? false;
}

export function getCompoundAdminLoginDestination(): string {
  return "/";
}

export function shouldShowCompoundContext(user: RoleLike): boolean {
  return hasRole(user, "super_admin");
}

const adminRouteRegistry: AdminSection[] = [
  { href: "/", labelKey: "dashboard", group: "operate", icon: "Home", keywords: ["home", "overview", "control center"], sidebar: true },
  { href: "/launch", labelKey: "launch", group: "operate", icon: "Rocket", keywords: ["readiness", "release", "go live"], requiredRole: "super_admin", sidebar: true },
  { href: "/analytics/operational", labelKey: "analytics", group: "operate", icon: "BarChart3", keywords: ["metrics", "operations", "reports"], sidebar: true },
  { href: "/compounds", labelKey: "compounds", group: "operate", icon: "Building2", keywords: ["compound registry", "properties"], requiredRole: "super_admin", sidebar: true },
  { href: "/compounds/new", labelKey: "newCompound", group: "operate", icon: "Building2", keywords: ["create compound", "add compound"], requiredRole: "super_admin", parentHref: "/compounds" },
  { href: "/onboarding", labelKey: "onboarding", group: "operate", icon: "UserPlus", keywords: ["owners", "registration", "verification"], sidebar: true },
  { href: "/units/assign", labelKey: "units", group: "operate", icon: "Users", keywords: ["apartments", "residents", "assignment"], sidebar: true },
  { href: "/vehicles", labelKey: "vehicles", group: "operate", icon: "Car", keywords: ["cars", "plates", "stickers", "vehicle lookup"], requiredPermission: "lookup_vehicles", sidebar: true },
  { href: "/visitors", labelKey: "visitors", group: "operate", icon: "DoorOpen", keywords: ["guests", "passes", "gate visitors"], sidebar: true },
  { href: "/finance", labelKey: "finance", group: "operate", icon: "WalletCards", keywords: ["accounts", "payments", "balances"], sidebar: true },
  { href: "/finance/advanced", labelKey: "financeAdvanced", group: "operate", icon: "Landmark", keywords: ["reserve funds", "budgets", "expenses", "vendors"], parentHref: "/finance" },
  { href: "/finance/reports", labelKey: "financeReports", group: "operate", icon: "Receipt", keywords: ["financial reports", "payment reports"], parentHref: "/finance" },
  { href: "/dues", labelKey: "dues", group: "operate", icon: "Receipt", keywords: ["charges", "recurring charges", "dues"], sidebar: true },
  { href: "/documents", labelKey: "documents", group: "community", icon: "FileText", keywords: ["files", "resident documents"], sidebar: true },
  { href: "/document-reviews", labelKey: "documentReviews", group: "community", icon: "ClipboardCheck", keywords: ["review documents", "document approvals"], parentHref: "/documents" },
  { href: "/issues", labelKey: "issues", group: "community", icon: "ClipboardList", keywords: ["tickets", "resident issues", "complaints"], sidebar: true },
  { href: "/work-orders", labelKey: "workOrders", group: "community", icon: "Wrench", keywords: ["maintenance", "vendors", "repairs"], sidebar: true },
  { href: "/announcements", labelKey: "announcements", group: "community", icon: "Megaphone", keywords: ["broadcasts", "messages", "news"], sidebar: true },
  { href: "/polls", labelKey: "polls", group: "govern", icon: "Vote", keywords: ["votes", "governance", "surveys"], sidebar: true },
  { href: "/polls/new", labelKey: "newPoll", group: "govern", icon: "Vote", keywords: ["create poll", "new vote"], parentHref: "/polls" },
  { href: "/polls/types", labelKey: "pollTypes", group: "govern", icon: "Scale", keywords: ["vote types", "governance types"], parentHref: "/polls" },
  { href: "/meetings", labelKey: "meetings", group: "govern", icon: "CalendarDays", keywords: ["board meetings", "minutes"], sidebar: true },
  { href: "/meetings/action-items", labelKey: "meetingActions", group: "govern", icon: "ClipboardCheck", keywords: ["meeting tasks", "action items"], parentHref: "/meetings" },
  { href: "/org-chart", labelKey: "orgChart", group: "govern", icon: "Network", keywords: ["org chart", "organization chart", "committee", "representatives"], sidebar: true },
  { href: "/representative-assignments", labelKey: "representatives", group: "govern", icon: "Users", keywords: ["representative assignments", "committee members"], parentHref: "/org-chart" },
  { href: "/security", labelKey: "security", group: "secure", icon: "Shield", keywords: ["security dashboard", "guard"], sidebar: true },
  { href: "/security/gates", labelKey: "securityGates", group: "secure", icon: "DoorOpen", keywords: ["gates", "entrances"], parentHref: "/security" },
  { href: "/security/shifts", labelKey: "securityShifts", group: "secure", icon: "CalendarDays", keywords: ["guard shifts", "roster"], parentHref: "/security" },
  { href: "/security/incidents", labelKey: "securityIncidents", group: "secure", icon: "Siren", keywords: ["incidents", "reports"], parentHref: "/security" },
  { href: "/security/manual-entries", labelKey: "manualEntries", group: "secure", icon: "ClipboardList", keywords: ["manual visitor entry", "gate log"], parentHref: "/security" },
  { href: "/security/devices", labelKey: "securityDevices", group: "secure", icon: "Smartphone", keywords: ["devices", "guard devices"], parentHref: "/security" },
  { href: "/security/admin", labelKey: "securityAdmin", group: "secure", icon: "Lock", keywords: ["admin security", "flags"], parentHref: "/security" },
  { href: "/security/admin-activity", labelKey: "adminActivity", group: "secure", icon: "Activity", keywords: ["sessions", "admin activity"], parentHref: "/security" },
  { href: "/audit-logs", labelKey: "auditLogs", group: "secure", icon: "ScrollText", keywords: ["audit", "logs", "activity log"], sidebar: true },
  { href: "/imports", labelKey: "imports", group: "system", icon: "Upload", keywords: ["data import", "bulk upload"], sidebar: true },
  { href: "/notifications/channels", labelKey: "notificationChannels", group: "system", icon: "Bell", keywords: ["push", "email", "sms", "templates"], sidebar: true },
  { href: "/support/users", labelKey: "supportUsers", group: "system", icon: "UserCog", keywords: ["users", "accounts", "roles", "support console"], sidebar: true },
  { href: "/support/merges", labelKey: "supportMerges", group: "system", icon: "Merge", keywords: ["merge users", "duplicate accounts"], parentHref: "/support/users" },
  { href: "/settings", labelKey: "settings", group: "system", icon: "Settings", keywords: ["configuration", "preferences"], sidebar: true },
  { href: "/settings/roles", labelKey: "roles", group: "system", icon: "KeyRound", keywords: ["roles", "access"], requiredPermission: "manage_roles", parentHref: "/settings" },
  { href: "/settings/permissions", labelKey: "permissions", group: "system", icon: "Lock", keywords: ["permissions", "access control"], requiredPermission: "manage_roles", parentHref: "/settings" },
  { href: "/privacy", labelKey: "privacy", group: "system", icon: "Lock", keywords: ["privacy", "data exports", "data requests"], sidebar: true },
  { href: "/violation-rules", labelKey: "violationRules", group: "system", icon: "Scale", keywords: ["violations", "penalty rules"], parentHref: "/settings" },
  { href: "/violation-rules/new", labelKey: "newViolationRule", group: "system", icon: "Scale", keywords: ["create violation rule"], parentHref: "/violation-rules" },
];

export function getAdminRouteRegistry(): AdminSection[] {
  return adminRouteRegistry;
}

export function getAdminSections(user: RoleLike): AdminSection[] {
  return adminRouteRegistry.filter((s) => {
    if (s.requiredRole && !hasRole(user, s.requiredRole)) return false;
    return !s.requiredPermission || hasPermission(user, s.requiredPermission);
  });
}
