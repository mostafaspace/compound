export type AdminDashboardActionRoute =
  | "Visitors"
  | "Units"
  | "Finance"
  | "AuditLog"
  | "AdminInvitations"
  | "Polls"
  | "CreatePoll"
  | "profile";

export interface AdminDashboardNavigationTarget {
  navigator?: "root" | "tab";
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
  { key: "CreatePoll", route: "CreatePoll" },
  { key: "Polls", route: "Polls" },
  { key: "Units", route: "Units" },
  { key: "Visitors", route: "Visitors" },
  { key: "Finance", route: "Finance" },
  { key: "AdminInvitations", route: "AdminInvitations" },
  { key: "AuditLog", route: "AuditLog" },
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
        navigator: "tab",
        screen: "More",
        params: { screen: "Settings" },
      };
    case "Polls":
      return {
        navigator: "tab",
        screen: "More",
        params: { screen: "Polls" },
      };
    case "CreatePoll":
      return {
        navigator: "root",
        screen: "CreatePoll",
      };
    case "AuditLog":
      return {
        navigator: "root",
        screen: "AuditLog",
      };
    case "AdminInvitations":
      return {
        navigator: "root",
        screen: "AdminInvitations",
      };
    default:
      return { navigator: "tab", screen: route };
  }
}
