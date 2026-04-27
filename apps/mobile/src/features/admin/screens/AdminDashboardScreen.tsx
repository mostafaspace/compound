import React from 'react';
import { View, StyleSheet, useColorScheme } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { Typography } from '../../../components/ui/Typography';
import { colors, spacing } from '../../../theme';

/**
 * Admin dashboard - shows compound overview, pending approvals, reports, etc.
 * This is the main screen for compound_admin, board_member, and super_admin roles.
 */
export const AdminDashboardScreen = () => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.header}>
        <Typography variant="h1">
          {t('Admin.dashboard', 'Admin Dashboard')}
        </Typography>
        <Typography variant="caption" style={styles.subtitle}>
          {t('Admin.welcome', 'Compound Management')}
        </Typography>
      </View>

      {/* Stats Overview */}
      <View style={styles.section}>
        <Typography variant="h2" style={styles.sectionTitle}>
          {t('Admin.overview', 'Overview')}
        </Typography>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light }]}>
            <Typography variant="h2" style={{ color: colors.primary.light }}>
              0
            </Typography>
            <Typography variant="caption">
              {t('Admin.pendingVisitors', 'Pending Visitors')}
            </Typography>
          </View>
          <View style={[styles.statCard, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light }]}>
            <Typography variant="h2" style={{ color: colors.warning }}>
              0
            </Typography>
            <Typography variant="caption">
              {t('Admin.pendingApprovals', 'Pending Approvals')}
            </Typography>
          </View>
          <View style={[styles.statCard, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light }]}>
            <Typography variant="h2" style={{ color: colors.success }}>
              0
            </Typography>
            <Typography variant="caption">
              {t('Admin.activeUnits', 'Active Units')}
            </Typography>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Typography variant="h2" style={styles.sectionTitle}>
          {t('Admin.quickActions', 'Quick Actions')}
        </Typography>
        <View style={styles.quickActionsGrid}>
          <View style={[styles.actionCard, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light }]}>
            <Typography style={{ fontSize: 32 }}>👥</Typography>
            <Typography variant="body" style={styles.actionLabel}>
              {t('Admin.visitors', 'Visitors')}
            </Typography>
          </View>
          <View style={[styles.actionCard, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light }]}>
            <Typography style={{ fontSize: 32 }}>💰</Typography>
            <Typography variant="body" style={styles.actionLabel}>
              {t('Admin.finance', 'Finance')}
            </Typography>
          </View>
          <View style={[styles.actionCard, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light }]}>
            <Typography style={{ fontSize: 32 }}>🏢</Typography>
            <Typography variant="body" style={styles.actionLabel}>
              {t('Admin.units', 'Units')}
            </Typography>
          </View>
          <View style={[styles.actionCard, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light }]}>
            <Typography style={{ fontSize: 32 }}>📊</Typography>
            <Typography variant="body" style={styles.actionLabel}>
              {t('Admin.reports', 'Reports')}
            </Typography>
          </View>
        </View>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actionCard: {
    flex: 1,
    width: '45%',
    padding: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  actionLabel: {
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
