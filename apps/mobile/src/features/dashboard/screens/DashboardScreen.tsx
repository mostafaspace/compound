import React from 'react';
import { View, StyleSheet, useColorScheme, TouchableOpacity } from 'react-native';
import { formatRoleLabel, getPrimaryEffectiveRole } from '@compound/contracts';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { selectCurrentUser, logout as logoutAction } from '../../../store/authSlice';
import { colors, spacing } from '../../../theme';
import { Button } from '../../../components/ui/Button';
import { Typography } from '../../../components/ui/Typography';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { useGetDashboardQuery } from '../../../services/dashboard';
import * as Keychain from "react-native-keychain";

const authTokenService = "compound.mobile.authToken";
const visitorTokenService = "compound.mobile.visitorPassTokens";

const shortcutRouteMap: Record<string, { screen: string; params?: object }> = {
  '/units/assign': { screen: 'Admin', params: { screen: 'Units' } },
  '/visitors/create': { screen: 'CreateVisitor' },
  '/issues/create': { screen: 'CreateIssue' },
  '/polls': { screen: 'Main', params: { screen: 'Polls' } },
  '/org-chart': { screen: 'Main', params: { screen: 'More', params: { screen: 'OrgChart' } } },
  '/visitors': { screen: 'Main', params: { screen: 'Visitors' } },
  '/issues': { screen: 'Main', params: { screen: 'More', params: { screen: 'Issues' } } },
  '/security/scanner': { screen: 'Guard', params: { screen: 'Scanner' } },
  '/security/entries': { screen: 'Guard', params: { screen: 'Gate' } },
  '/security/manual-entry': { screen: 'Guard', params: { screen: 'Gate' } },
  '/governance': { screen: 'Main', params: { screen: 'Polls' } },
};

export const DashboardScreen = () => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const user = useSelector(selectCurrentUser);
  const dispatch = useDispatch();
  const navigation = useNavigation<any>();
  const { data: dashboard } = useGetDashboardQuery();

  const handleSignOut = async () => {
    await Keychain.resetGenericPassword({ service: authTokenService });
    await Keychain.resetGenericPassword({ service: visitorTokenService });
    dispatch(logoutAction());
  };

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

  return (
    <ScreenContainer scrollable>
      <View style={styles.header}>
        <Typography variant="label">{t("App.brand")}</Typography>
        <Typography variant="h1">{t("App.title")}</Typography>
        <Typography variant="caption">{t("App.subtitle")}</Typography>
      </View>

      <View style={[styles.welcomePanel, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light, borderColor: isDark ? colors.border.dark : colors.border.light }]}>
        <Typography variant="label" style={styles.panelLabel}>{t("Auth.signedIn")}</Typography>
        <Typography variant="h2">{user.name}</Typography>
        <Typography style={styles.userRole}>
          {t(`Common.roles.${primaryRole}`, { defaultValue: formatRoleLabel(primaryRole) })}
        </Typography>
      </View>

      {/* Attention items — things that need user action */}
      {attentionItems.length > 0 && (
        <View style={styles.attentionSection}>
          <Typography variant="h3" style={styles.sectionTitle}>
            {t("Dashboard.needsAttention", { defaultValue: "Needs Your Attention" })}
          </Typography>
          {attentionItems.map((item, index) => (
            <TouchableOpacity
              key={item.type + index}
              style={[styles.attentionItem, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light, borderColor: isDark ? colors.border.dark : colors.border.light }]}
              onPress={() => navigateToRoute(item.route)}
              activeOpacity={0.7}
            >
              <View style={styles.attentionBadge}>
                <Typography style={styles.attentionCount}>{item.count}</Typography>
              </View>
              <Typography style={styles.attentionLabel}>{item.label}</Typography>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Quick action shortcuts — clickable */}
      <View style={styles.quickActions}>
        <Typography variant="h3" style={styles.sectionTitle}>{t("QuickActions.label")}</Typography>
        <View style={styles.grid}>
          {shortcuts.map((shortcut) => (
            <TouchableOpacity
              key={shortcut.key}
              style={[styles.widget, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light, borderColor: isDark ? colors.border.dark : colors.border.light }]}
              onPress={() => navigateToRoute(shortcut.route)}
              activeOpacity={0.7}
            >
              <Typography variant="label">{shortcut.label}</Typography>
            </TouchableOpacity>
          ))}
          {shortcuts.length === 0 && (
            <Typography variant="caption">
              {t("Dashboard.noShortcuts", { defaultValue: "No quick actions available" })}
            </Typography>
          )}
        </View>
      </View>

      <Button
        variant="outline"
        title={t("Auth.signOut")}
        onPress={handleSignOut}
        style={styles.signOutButton}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.xl,
  },
  welcomePanel: {
    padding: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  panelLabel: {
    marginBottom: spacing.xs,
    color: '#6b7280',
  },
  userRole: {
    fontWeight: '600',
    color: colors.primary.dark,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  attentionSection: {
    marginBottom: spacing.lg,
  },
  attentionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  attentionBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  attentionCount: {
    fontWeight: '700',
    color: '#dc2626',
    fontSize: 14,
  },
  attentionLabel: {
    flex: 1,
    fontWeight: '500',
  },
  quickActions: {
    marginBottom: spacing.xl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  widget: {
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 100,
    alignItems: 'center',
  },
  signOutButton: {
    marginTop: spacing.xl,
  },
});
