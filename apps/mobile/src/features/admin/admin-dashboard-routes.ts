export type AdminDashboardActionRoute =
  | "Visitors"
  | "Units"
  | "Finance"
  | "AuditLog"
  | "AdminInvitations"
  | "Polls"
  | "profile";

export interface AdminDashboardNavigationTarget {
  screen: string;
  params?: {
    screen?: string;
  };
}

export interface AdminDashboardQuickAction {
  key: AdminDashboardActionRoute;
  route: AdminDashboardActionRoute;
}

const QUICK_ACTIONS: AdminDashboardQuickAction[] = [
  { key: "Visitors", route: "Visitors" },
  { key: "Units", route: "Units" },
  { key: "Finance", route: "Finance" },
  { key: "AuditLog", route: "AuditLog" },
  { key: "AdminInvitations", route: "AdminInvitations" },
  { key: "Polls", route: "Polls" },
];

export function getAdminDashboardQuickActions(): AdminDashboardQuickAction[] {
  return QUICK_ACTIONS;
}

export function getAdminDashboardNavigationTarget(
  route: AdminDashboardActionRoute,
): AdminDashboardNavigationTarget {
  switch (route) {
    case "profile":
      return {
        screen: "More",
        params: { screen: "Settings" },
      };
    case "Polls":
      return {
        screen: "More",
        params: { screen: "Polls" },
      };
    default:
      return { screen: route };
  }
}
