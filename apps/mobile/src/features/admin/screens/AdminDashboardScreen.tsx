import React from 'react';
import { View, StyleSheet, useColorScheme, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../navigation/types';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { Typography } from '../../../components/ui/Typography';
import { colors, spacing } from '../../../theme';

import { useGetOperationalAnalyticsQuery } from '../../../services/admin';

/**
 * Admin dashboard - shows compound overview, pending approvals, reports, etc.
 * This is the main screen for compound_admin, board_member, and super_admin roles.
 */
export const AdminDashboardScreen = () => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const navigation = useNavigation<StackNavigationProp<any>>();
  
  const { data: analytics, isLoading } = useGetOperationalAnalyticsQuery();

  return (
    <ScreenContainer style={styles.container} edges={['left', 'right', 'bottom']}>
      <View style={styles.header}>
        <Typography variant="h1">
          {t('Admin.dashboard', 'Admin Dashboard')}
        </Typography>
        <Typography variant="caption" style={styles.subtitle}>
          {t('Admin.welcome', 'Compound Management')}
        </Typography>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary.light} size="large" style={{ marginTop: spacing.xl }} />
      ) : (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Typography variant="h2" style={styles.sectionTitle}>
              {t('Admin.overview', 'Overview')}
            </Typography>
            {analytics?.generatedAt && (
              <Typography variant="caption" style={styles.timestamp}>
                {new Date(analytics.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Typography>
            )}
          </View>
          
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light }]}>
              <Typography variant="h2" style={{ color: colors.primary.light }}>
                {analytics?.visitors?.pending ?? 0}
              </Typography>
              <Typography variant="caption" style={styles.statLabel}>
                {t('Admin.pendingVisitors', 'Pending Visitors')}
              </Typography>
            </View>
            <View style={[styles.statCard, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light }]}>
              <Typography variant="h2" style={{ color: colors.warning }}>
                {analytics?.verifications?.pendingReview ?? 0}
              </Typography>
              <Typography variant="caption" style={styles.statLabel}>
                {t('Admin.pendingApprovals', 'Pending Approvals')}
              </Typography>
            </View>
            <View style={[styles.statCard, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light }]}>
              <Typography variant="h2" style={{ color: colors.error }}>
                {analytics?.issues?.new ?? 0}
              </Typography>
              <Typography variant="caption" style={styles.statLabel}>
                {t('Admin.activeIssues', 'Active Issues')}
              </Typography>
            </View>
          </View>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Typography variant="h2" style={styles.sectionTitle}>
          {t('Admin.quickActions', 'Quick Actions')}
        </Typography>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light }]}
            onPress={() => navigation.navigate('Visitors')}
          >
            <Typography style={{ fontSize: 32 }}>🚗</Typography>
            <Typography variant="body" style={styles.actionLabel}>
              {t('Admin.visitors', 'Visitors')}
            </Typography>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light }]}
            onPress={() => navigation.navigate('Finance')}
          >
            <Typography style={{ fontSize: 32 }}>💸</Typography>
            <Typography variant="body" style={styles.actionLabel}>
              {t('Admin.finance', 'Finance')}
            </Typography>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light }]}
            onPress={() => navigation.navigate('Units')}
          >
            <Typography style={{ fontSize: 32 }}>🏘️</Typography>
            <Typography variant="body" style={styles.actionLabel}>
              {t('Admin.units', 'Units')}
            </Typography>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light }]}
            onPress={() => {}}
          >
            <Typography style={{ fontSize: 32 }}>📈</Typography>
            <Typography variant="body" style={styles.actionLabel}>
              {t('Admin.reports', 'Reports')}
            </Typography>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light }]}
            onPress={() => navigation.navigate('AdminInvitations' as any)}
          >
            <Typography style={{ fontSize: 32 }}>📧</Typography>
            <Typography variant="body" style={styles.actionLabel}>
              {t('Admin.invitations', 'Invitations')}
            </Typography>
          </TouchableOpacity>
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    marginBottom: 0,
  },
  timestamp: {
    color: colors.text.secondary.light,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  statLabel: {
    marginTop: spacing.xs,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
