export type DashboardShortcutTarget = {
  navigator: 'root' | 'tab';
  screen: string;
  params?: object;
};

const shortcutRouteMap: Record<string, { screen: string; params?: object }> = {
  '/units/assign': { screen: 'Admin', params: { screen: 'Units' } },
  '/visitors/create': { screen: 'CreateVisitor' },
  '/issues/create': { screen: 'AddEditIssue' },
  '/polls': { screen: 'Main', params: { screen: 'More', params: { screen: 'Polls', initial: false } } },
  '/org-chart': { screen: 'Main', params: { screen: 'More', params: { screen: 'OrgChart', initial: false } } },
  '/visitors': { screen: 'Main', params: { screen: 'Visitors' } },
  '/apartments': { screen: 'Main', params: { screen: 'Apartments', params: { screen: 'ApartmentsList' } } },
  '/property': { screen: 'Main', params: { screen: 'Apartments', params: { screen: 'ApartmentsList' } } },
  '/finance': { screen: 'Main', params: { screen: 'Apartments', params: { screen: 'ApartmentsList' } } },
  '/documents': { screen: 'Main', params: { screen: 'Apartments', params: { screen: 'ApartmentsList' } } },
  '/issues': { screen: 'Main', params: { screen: 'More', params: { screen: 'Issues', initial: false } } },
  '/security/scanner': { screen: 'Guard', params: { screen: 'Scanner' } },
  '/security/entries': { screen: 'Guard', params: { screen: 'Gate' } },
  '/security/manual-entry': { screen: 'Guard', params: { screen: 'Gate' } },
  '/governance': { screen: 'Main', params: { screen: 'More', params: { screen: 'Polls', initial: false } } },
};

const mainTabScreens = new Set(['Dashboard', 'Apartments', 'Visitors', 'Polls', 'More']);

export function resolveDashboardShortcutTarget(route: string): DashboardShortcutTarget | null {
  const mapping = shortcutRouteMap[route];
  if (!mapping) {
    return null;
  }

  if (mapping.screen === 'Main' && mapping.params && 'screen' in mapping.params) {
    const tabTarget = mapping.params as { screen: string; params?: object };
    if (mainTabScreens.has(tabTarget.screen)) {
      return { navigator: 'tab', screen: tabTarget.screen, params: tabTarget.params };
    }

    return null;
  }

  if (mainTabScreens.has(mapping.screen)) {
    return { navigator: 'tab', screen: mapping.screen, params: mapping.params };
  }

  return { navigator: 'root', screen: mapping.screen, params: mapping.params };
}
