const SAFE_DASHBOARD_PATHS = new Set([
  "/analytics/operational",
  "/announcements",
  "/audit-logs",
  "/compounds",
  "/documents",
  "/dues",
  "/finance",
  "/issues",
  "/meetings",
  "/notifications/channels",
  "/onboarding",
  "/polls",
  "/polls/new",
  "/polls/types",
  "/privacy",
  "/representative-assignments",
  "/security",
  "/security/admin-activity",
  "/security/devices",
  "/security/gates",
  "/security/incidents",
  "/security/manual-entries",
  "/security/shifts",
  "/settings",
  "/settings/permissions",
  "/settings/roles",
  "/support/merges",
  "/support/users",
  "/units/assign",
  "/vehicles",
  "/visitors",
  "/work-orders",
]);

const DASHBOARD_ROUTE_ALIASES: Record<string, string | null> = {
  "/governance": "/polls",
  "/issues/create": "/issues",
  "/org-chart": "__ORG_CHART__",
  "/polls/create": "/polls/new",
  "/security/entries": "/security/manual-entries",
  "/security/manual-entry": "/security/manual-entries",
  "/security/scanner": null,
  "/users/invite": null,
  "/visitors/create": "/visitors",
};

interface DashboardRouteOptions {
  activeCompoundId?: string | null;
}

function serializeRoute(pathname: string, search: string, hash: string): string {
  return `${pathname}${search}${hash}`;
}

function isScopedOrgChartPath(pathname: string): boolean {
  return /^\/compounds\/[^/]+\/org-chart$/.test(pathname);
}

export function resolveDashboardRoute(
  route: string,
  { activeCompoundId }: DashboardRouteOptions = {},
): string | null {
  if (!route.startsWith("/")) {
    return null;
  }

  let parsed: URL;

  try {
    parsed = new URL(route, "https://admin.local");
  } catch {
    return null;
  }

  const alias = DASHBOARD_ROUTE_ALIASES[parsed.pathname];
  let pathname = parsed.pathname;

  if (alias === null) {
    return null;
  }

  if (alias === "__ORG_CHART__") {
    if (!activeCompoundId) {
      return null;
    }

    pathname = `/compounds/${activeCompoundId}/org-chart`;
  } else if (alias) {
    pathname = alias;
  }

  if (SAFE_DASHBOARD_PATHS.has(pathname) || isScopedOrgChartPath(pathname)) {
    return serializeRoute(pathname, parsed.search, parsed.hash);
  }

  return null;
}

export function sanitizeDashboardCollection<T extends { route: string }>(
  items: T[],
  options: DashboardRouteOptions = {},
): T[] {
  return items.flatMap((item) => {
    const safeRoute = resolveDashboardRoute(item.route, options);

    if (!safeRoute) {
      return [];
    }

    return [{ ...item, route: safeRoute }];
  });
}
