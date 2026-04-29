import React from 'react';
import { View, StyleSheet, useColorScheme } from 'react-native';
import { formatRoleLabel, getPrimaryEffectiveRole } from '@compound/contracts';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import { selectCurrentUser, logout as logoutAction } from '../../../store/authSlice';
import { colors, spacing } from '../../../theme';
import { Button } from '../../../components/ui/Button';
import { Typography } from '../../../components/ui/Typography';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { usePermission } from '../../../hooks/usePermission';
import * as Keychain from "react-native-keychain";

const authTokenService = "compound.mobile.authToken";
const visitorTokenService = "compound.mobile.visitorPassTokens";

export const DashboardScreen = () => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const user = useSelector(selectCurrentUser);
  const dispatch = useDispatch();

  const canViewFinance = usePermission('view_finance');
  const canViewIssues = usePermission('view_issues');
  const canViewVisitors = usePermission('view_visitors');

  const handleSignOut = async () => {
    await Keychain.resetGenericPassword({ service: authTokenService });
    await Keychain.resetGenericPassword({ service: visitorTokenService });
    dispatch(logoutAction());
  };

  if (!user) return null;

  const primaryRole = getPrimaryEffectiveRole(user);

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

      <View style={styles.quickActions}>
        <Typography variant="h3" style={styles.sectionTitle}>{t("QuickActions.label")}</Typography>
        <View style={styles.grid}>
          {canViewFinance && (
            <View style={[styles.widget, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light, borderColor: isDark ? colors.border.dark : colors.border.light }]}>
              <Typography variant="label">{t("Finance.label", { defaultValue: "Finance" })}</Typography>
            </View>
          )}
          {canViewIssues && (
            <View style={[styles.widget, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light, borderColor: isDark ? colors.border.dark : colors.border.light }]}>
              <Typography variant="label">{t("Issues.label", { defaultValue: "Issues" })}</Typography>
            </View>
          )}
          {canViewVisitors && (
            <View style={[styles.widget, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light, borderColor: isDark ? colors.border.dark : colors.border.light }]}>
              <Typography variant="label">{t("Visitors.label", { defaultValue: "Visitors" })}</Typography>
            </View>
          )}
          {!canViewFinance && !canViewIssues && !canViewVisitors && (
            <Typography variant="caption">Quick actions coming soon...</Typography>
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
  }
});
