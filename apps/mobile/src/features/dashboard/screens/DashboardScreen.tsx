import React from 'react';
import { View, StyleSheet, useColorScheme, Pressable } from 'react-native';
import { formatRoleLabel, getPrimaryEffectiveRole } from '@compound/contracts';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { selectCurrentUser } from '../../../store/authSlice';
import { colors, layout, radii, shadows, spacing } from '../../../theme';
import { Typography } from '../../../components/ui/Typography';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { useGetDashboardQuery } from '../../../services/dashboard';
import { Card } from '../../../components/ui/Card';
import { Icon, type AppIconName } from '../../../components/ui/Icon';

const shortcutRouteMap: Record<string, { screen: string; params?: object }> = {
  '/units/assign': { screen: 'Admin', params: { screen: 'Units' } },
  '/visitors/create': { screen: 'CreateVisitor' },
  '/issues/create': { screen: 'AddEditIssue' },
  '/polls': { screen: 'Main', params: { screen: 'Polls' } },
  '/org-chart': { screen: 'Main', params: { screen: 'More', params: { screen: 'OrgChart', initial: false } } },
  '/visitors': { screen: 'Main', params: { screen: 'Visitors' } },
  '/issues': { screen: 'Main', params: { screen: 'More', params: { screen: 'Issues', initial: false } } },
  '/security/scanner': { screen: 'Guard', params: { screen: 'Scanner' } },
  '/security/entries': { screen: 'Guard', params: { screen: 'Gate' } },
  '/security/manual-entry': { screen: 'Guard', params: { screen: 'Gate' } },
  '/governance': { screen: 'Main', params: { screen: 'Polls' } },
};

export const DashboardScreen = () => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const user = useSelector(selectCurrentUser);
  const navigation = useNavigation<any>();
  const { data: dashboard } = useGetDashboardQuery();

  const navigateToRoute = (route: string) => {
    const mapping = shortcutRouteMap[route];
    if (mapping) {
      navigation.navigate(mapping.screen, mapping.params);
    }
  };

  if (!user) return null;

  const primaryRole = getPrimaryEffectiveRole(user);
  const attentionItems = dashboard?.attentionItems ?? [];
  const shortcuts = dashboard?.shortcuts ?? [];
  const shortcutIcon = (route: string): AppIconName => {
    if (route.includes('visitor')) return 'visitors';
    if (route.includes('finance')) return 'finance';
    if (route.includes('poll')) return 'polls';
    if (route.includes('issue')) return 'issues';
    if (route.includes('security')) return 'qr';
    if (route.includes('unit')) return 'units';
    if (route.includes('org-chart')) return 'building';
    return 'dashboard';
  };

  return (
    <ScreenContainer scrollable>
      <Card style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.heroIcon}>
            <Icon name="building" color={colors.primary.light} size={26} />
          </View>
          <Typography variant="label">{t("Auth.signedIn")}</Typography>
        </View>
        <Typography variant="h1" style={styles.heroTitle}>{user.name}</Typography>
        <Typography variant="body" style={styles.heroSubtitle}>
          {t(`Common.roles.${primaryRole}`, { defaultValue: formatRoleLabel(primaryRole) })}
        </Typography>
      </Card>

      {attentionItems.length > 0 && (
        <View style={styles.attentionSection}>
          <Typography variant="h3" style={styles.sectionTitle}>
            {t("Dashboard.needsAttention", { defaultValue: "Needs Your Attention" })}
          </Typography>
          {attentionItems.map((item, index) => (
            <Pressable
              key={item.type + index}
              style={[styles.attentionItem, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light, borderColor: isDark ? colors.border.dark : colors.border.light }]}
              onPress={() => navigateToRoute(item.route)}
              accessibilityRole="button"
            >
              <View style={styles.attentionBadge}>
                <Typography style={styles.attentionCount}>{item.count}</Typography>
              </View>
              <Typography style={styles.attentionLabel}>{item.label}</Typography>
              <Icon name="chevron-right" color={isDark ? colors.text.secondary.dark : colors.text.secondary.light} size={20} />
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.quickActions}>
        <Typography variant="h3" style={styles.sectionTitle}>{t("QuickActions.label")}</Typography>
        <View style={styles.grid}>
          {shortcuts.map((shortcut) => (
            <Pressable
              key={shortcut.key}
              style={[styles.widget, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light, borderColor: isDark ? colors.border.dark : colors.border.light }]}
              onPress={() => navigateToRoute(shortcut.route)}
              accessibilityRole="button"
            >
              <View style={styles.widgetIcon}>
                <Icon name={shortcutIcon(shortcut.route)} color={colors.primary.light} size={22} />
              </View>
              <Typography variant="body" style={styles.widgetLabel}>{shortcut.label}</Typography>
            </Pressable>
          ))}
          {shortcuts.length === 0 && (
            <Typography variant="caption">
              {t("Dashboard.noShortcuts", { defaultValue: "No quick actions available" })}
            </Typography>
          )}
        </View>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  hero: {
    marginBottom: layout.sectionGap,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.palette.teal[50],
  },
  heroTitle: {
    marginBottom: spacing.xs,
  },
  heroSubtitle: {
    color: colors.primary.light,
    fontWeight: '700',
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  attentionSection: {
    marginBottom: layout.sectionGap,
  },
  attentionItem: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    padding: layout.cardPadding,
    borderRadius: radii.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  attentionBadge: {
    minWidth: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.palette.red[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  attentionCount: {
    fontWeight: '800',
    color: colors.error,
    fontSize: 15,
  },
  attentionLabel: {
    flex: 1,
    fontWeight: '700',
  },
  quickActions: {
    marginBottom: layout.sectionGap,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: layout.cardGap,
  },
  widget: {
    flexGrow: 1,
    flexBasis: '45%',
    minHeight: 132,
    padding: layout.cardPadding,
    borderRadius: radii.xl,
    borderWidth: 1,
    justifyContent: 'space-between',
    ...shadows.sm,
  },
  widgetIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted.light,
    marginBottom: spacing.md,
  },
  widgetLabel: {
    fontWeight: '800',
  },
});
