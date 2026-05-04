import React from 'react';
import { View, StyleSheet, useColorScheme, ActivityIndicator, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Rect } from 'react-native-svg';

import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { Typography } from '../../../components/ui/Typography';
import { colors, spacing, shadows } from '../../../theme';
import { useGetOperationalAnalyticsQuery } from '../../../services/admin';
import {
  type AdminDashboardActionRoute,
  getAdminDashboardNavigationTarget,
  getAdminDashboardQuickActions,
} from '../admin-dashboard-routes';

const { width } = Dimensions.get('window');

/**
 * Admin dashboard - shows compound overview, pending approvals, reports, etc.
 */
export const AdminDashboardScreen = () => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const navigation = useNavigation<StackNavigationProp<any>>();

  const { data: analytics, isLoading } = useGetOperationalAnalyticsQuery();
  const quickActions = getAdminDashboardQuickActions();

  const navigateToTarget = (route: Parameters<typeof getAdminDashboardNavigationTarget>[0]) => {
    const target = getAdminDashboardNavigationTarget(route);
    navigation.navigate(target.screen as any, target.params as any);
  };

  const getActionIcon = (route: AdminDashboardActionRoute) => {
    switch (route) {
      case 'Visitors':
        return 'VI';
      case 'Units':
        return 'UN';
      case 'Finance':
        return 'FN';
      case 'AuditLog':
        return 'AU';
      case 'AdminInvitations':
        return 'IN';
      case 'Polls':
        return 'PL';
      default:
        return 'ME';
    }
  };

  const getActionLabel = (route: AdminDashboardActionRoute) => {
    switch (route) {
      case 'Visitors':
        return t('Admin.visitors', 'Visitors');
      case 'Units':
        return t('Admin.units', 'Units');
      case 'Finance':
        return t('Admin.finance', 'Finance');
      case 'AuditLog':
        return t('Admin.logs', 'Audit');
      case 'AdminInvitations':
        return t('Admin.invites', 'Invites');
      case 'Polls':
        return t('Admin.polls', 'Polls');
      default:
        return t('Common.profile', 'Profile');
    }
  };

  const renderStatCard = (label: string, value: number | string, color: string, icon: string) => (
    <View style={[styles.statCard, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light }]}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '15' }]}>
        <Typography style={styles.iconText}>{icon}</Typography>
      </View>
      <View>
        <Typography variant="h2" style={{ color: color, fontSize: 24, fontWeight: '800' }}>
          {value}
        </Typography>
        <Typography variant="caption" style={styles.statLabel}>
          {label}
        </Typography>
      </View>
    </View>
  );

  return (
    <ScreenContainer edges={['left', 'right', 'bottom']} style={{ backgroundColor: isDark ? colors.background.dark : '#f8fafc' }}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Typography variant="h1" style={styles.headerTitle}>
              {t('Admin.dashboard', 'Operations')}
            </Typography>
            <Typography variant="caption" style={styles.subtitle}>
              {analytics?.generatedAt ? new Date(analytics.generatedAt).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) : 'Compound Management'}
            </Typography>
          </View>
          <TouchableOpacity
            style={[styles.profileButton, { backgroundColor: isDark ? '#1e293b' : '#fff' }]}
            onPress={() => navigateToTarget('profile')}
          >
            <Typography style={styles.iconText}>ME</Typography>
          </TouchableOpacity>
        </View>

        {/* Hero Analytics Card */}
        <View style={styles.heroContainer}>
          <Svg height="140" width={width - spacing.lg * 2} style={styles.heroBg}>
            <Defs>
              <SvgGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={colors.primary.light} stopOpacity="1" />
                <Stop offset="1" stopColor={colors.primary.dark} stopOpacity="1" />
              </SvgGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" rx="24" fill="url(#grad)" />
          </Svg>
          <View style={styles.heroContent}>
            <View>
              <Typography variant="h2" style={styles.heroValue}>
                {analytics?.users?.total ?? 0}
              </Typography>
              <Typography variant="caption" style={styles.heroLabel}>
                {t('Admin.totalResidents', 'Total Residents')}
              </Typography>
            </View>
            <View style={styles.heroDivider} />
            <View>
              <Typography variant="h2" style={styles.heroValue}>
                {analytics?.visitors?.total ?? 0}
              </Typography>
              <Typography variant="caption" style={styles.heroLabel}>
                {t('Admin.monthlyVisitors', 'Monthly Visitors')}
              </Typography>
            </View>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary.light} size="large" />
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <Typography variant="h3" style={styles.sectionTitle}>
                {t('Admin.attentionNeeded', 'Attention Needed')}
              </Typography>
              <View style={styles.statsGrid}>
                {renderStatCard(t('Admin.pending', 'Pending'), analytics?.verifications?.pendingReview ?? 0, colors.warning, 'RV')}
                {renderStatCard(t('Admin.activeIssues', 'Issues'), analytics?.issues?.new ?? 0, colors.error, 'IS')}
              </View>
            </View>

            <View style={styles.section}>
              <Typography variant="h3" style={styles.sectionTitle}>
                {t('Admin.quickActions', 'Management Tools')}
              </Typography>
              <View style={styles.quickActionsGrid}>
                {quickActions.map((action, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.actionCard,
                      { backgroundColor: isDark ? colors.surface.dark : colors.surface.light }
                    ]}
                    onPress={() => navigateToTarget(action.route)}
                  >
                    <View style={styles.actionIconBg}>
                      <Typography style={{ fontSize: 24 }}>{getActionIcon(action.route)}</Typography>
                    </View>
                    <Typography variant="label" style={styles.actionLabel}>
                      {getActionLabel(action.route)}
                    </Typography>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Health Indicators */}
            <View style={styles.section}>
              <Typography variant="h3" style={styles.sectionTitle}>
                {t('Admin.health', 'System Health')}
              </Typography>
              <View style={[styles.healthCard, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light }]}>
                <View style={styles.healthRow}>
                  <Typography variant="body" style={styles.healthLabel}>Announcement Reach</Typography>
                  <Typography variant="body" style={styles.healthValue}>
                    {analytics?.announcements?.ackCount ?? 0} / {analytics?.announcements?.requiresAckCount ?? 0}
                  </Typography>
                </View>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${analytics?.announcements?.requiresAckCount ? (analytics.announcements.ackCount / analytics.announcements.requiresAckCount) * 100 : 0}%`,
                        backgroundColor: colors.primary.light
                      }
                    ]}
                  />
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: colors.text.secondary.light,
    marginTop: 2,
    fontWeight: '500',
  },
  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    ...shadows.sm,
  },
  iconText: {
    color: colors.primary.light,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  heroContainer: {
    height: 140,
    marginBottom: spacing.xl,
    borderRadius: 24,
    overflow: 'hidden',
    ...shadows.md,
  },
  heroBg: {
    position: 'absolute',
  },
  heroContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.xl,
  },
  heroValue: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  heroDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    marginBottom: spacing.md,
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary.dark,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 20,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    ...shadows.sm,
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statLabel: {
    color: colors.text.secondary.light,
    fontSize: 11,
    fontWeight: '600',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actionCard: {
    width: (width - spacing.lg * 2 - spacing.md * 2) / 3,
    paddingVertical: spacing.lg,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    ...shadows.sm,
  },
  actionIconBg: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.02)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  healthCard: {
    padding: spacing.lg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    ...shadows.sm,
  },
  healthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  healthLabel: {
    fontWeight: '600',
  },
  healthValue: {
    fontWeight: '800',
    color: colors.primary.light,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
});
