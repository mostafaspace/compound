import React from 'react';
import { View, StyleSheet, useColorScheme, ActivityIndicator, TouchableOpacity, ScrollView, Dimensions, FlatList } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Rect } from 'react-native-svg';

import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { Typography } from '../../../components/ui/Typography';
import { colors, layout, spacing, shadows, radii } from '../../../theme';
import { useGetOperationalAnalyticsQuery } from '../../../services/admin';
import { Icon, type AppIconName } from '../../../components/ui/Icon';
import { isRtlLanguage, rowDirectionStyle, textDirectionStyle } from '../../../i18n/direction';
import {
  AdminDashboardActionRoute,
  getAdminDashboardNavigationTarget,
  getAdminDashboardQuickActions,
} from '../admin-dashboard-routes';

const { width } = Dimensions.get('window');

/**
 * Admin dashboard - shows compound overview, pending approvals, reports, etc.
 */
export const AdminDashboardScreen = () => {
  const { t, i18n } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const isRtl = isRtlLanguage(i18n.language);
  const navigation = useNavigation<StackNavigationProp<any>>();

  const { data: analytics, isLoading } = useGetOperationalAnalyticsQuery();
  const quickActions = getAdminDashboardQuickActions();

  const navigateToTarget = (route: Parameters<typeof getAdminDashboardNavigationTarget>[0]) => {
    const target = getAdminDashboardNavigationTarget(route);
    if (target.navigator === 'root') {
      const rootNavigation = navigation.getParent<StackNavigationProp<any>>();
      rootNavigation?.navigate(target.screen as any, target.params as any);
      return;
    }

    navigation.navigate(target.screen as any, target.params as any);
  };

  const getActionIcon = (route: AdminDashboardActionRoute): AppIconName => {
    switch (route) {
      case 'Visitors':
        return 'visitors';
      case 'Units':
        return 'units';
      case 'Finance':
        return 'finance';
      case 'AuditLog':
        return 'shield';
      case 'AdminInvitations':
        return 'user';
      case 'Polls':
        return 'polls';
      case 'CreatePoll':
        return 'plus';
      default:
        return 'more';
    }
  };

  const getActionLabel = (route: AdminDashboardActionRoute) => {
    switch (route) {
      case 'Visitors':
        return t('Admin.visitors', 'Visitors');
      case 'Units':
        return t('Admin.units', 'Units');
      case 'Finance':
        return t('Admin.finance', 'Contributions');
      case 'AuditLog':
        return t('Admin.logs', 'Audit');
      case 'AdminInvitations':
        return t('Admin.invites', 'Invites');
      case 'Polls':
        return t('Admin.polls', 'Polls');
      case 'CreatePoll':
        return t('Admin.createPoll', 'New Poll');
      default:
        return t('Common.profile', 'Profile');
    }
  };

  const renderQuickAction = ({ item: action }: { item: ReturnType<typeof getAdminDashboardQuickActions>[number] }) => (
    <TouchableOpacity
      style={[
        styles.actionCard,
        { backgroundColor: isDark ? colors.surface.dark : colors.surface.light, borderColor: isDark ? colors.border.dark : colors.border.light }
      ]}
      onPress={() => navigateToTarget(action.route)}
      accessibilityRole="button"
    >
      <View style={styles.actionIconBg}>
        <Icon name={getActionIcon(action.route)} color={colors.primary.light} size={24} />
      </View>
      <Typography variant="label" style={[styles.actionLabel, textDirectionStyle(isRtl)]}>
        {getActionLabel(action.route)}
      </Typography>
    </TouchableOpacity>
  );

  const renderStatCard = (label: string, value: number | string, color: string, icon: AppIconName, onPress?: () => void) => (
    <TouchableOpacity 
      disabled={!onPress}
      onPress={onPress}
      style={[styles.statCard, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light, borderColor: isDark ? colors.border.dark : colors.border.light }, rowDirectionStyle(isRtl)]}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <View style={[styles.statIconContainer, { backgroundColor: isDark ? colors.surfaceMuted.dark : colors.surfaceMuted.light }]}>
        <Icon name={icon} color={color} size={22} />
      </View>
      <View style={textDirectionStyle(isRtl)}>
        <Typography variant="h2" style={[{ color: color, fontSize: 24, fontWeight: '800' }, textDirectionStyle(isRtl)]}>
          {value}
        </Typography>
        <Typography variant="caption" style={[styles.statLabel, textDirectionStyle(isRtl)]}>
          {label}
        </Typography>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer
      style={[
        styles.screen,
        { backgroundColor: isDark ? colors.background.dark : colors.background.light },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, rowDirectionStyle(isRtl)]}>
          <View style={textDirectionStyle(isRtl)}>
            <Typography variant="h1" style={[styles.headerTitle, textDirectionStyle(isRtl)]}>
              {t('Admin.dashboard')}
            </Typography>
            <Typography variant="caption" style={[styles.subtitle, textDirectionStyle(isRtl)]}>
              {analytics?.generatedAt ? new Date(analytics.generatedAt).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : t('App.brand')}
            </Typography>
          </View>
          <TouchableOpacity
            style={[styles.profileButton, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light, borderColor: isDark ? colors.border.dark : colors.border.light }]}
            onPress={() => navigateToTarget('profile')}
            accessibilityRole="button"
            accessibilityLabel={t('Common.profile', 'Profile')}
          >
            <Icon name="user" color={colors.primary.light} size={22} />
          </TouchableOpacity>
        </View>

        {/* Hero Analytics Card */}
        <View style={styles.heroContainer}>
          <Svg height="140" width={width - layout.screenGutter * 2} style={styles.heroBg}>
            <Defs>
              <SvgGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={colors.primary.light} stopOpacity="1" />
                <Stop offset="1" stopColor={colors.primary.dark} stopOpacity="1" />
              </SvgGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" rx="24" fill="url(#grad)" />
          </Svg>
          <View style={[styles.heroContent, rowDirectionStyle(isRtl)]}>
            <View style={textDirectionStyle(isRtl)}>
              <Typography variant="h2" style={[styles.heroValue, textDirectionStyle(isRtl)]}>
                {analytics?.users?.total ?? 0}
              </Typography>
              <Typography variant="caption" style={[styles.heroLabel, textDirectionStyle(isRtl)]}>
                {t('Admin.totalResidents', 'Total Residents')}
              </Typography>
            </View>
            <View style={styles.heroDivider} />
            <View style={textDirectionStyle(isRtl)}>
              <Typography variant="h2" style={[styles.heroValue, textDirectionStyle(isRtl)]}>
                {analytics?.visitors?.total ?? 0}
              </Typography>
              <Typography variant="caption" style={[styles.heroLabel, textDirectionStyle(isRtl)]}>
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
              <Typography variant="h3" style={[styles.sectionTitle, textDirectionStyle(isRtl)]}>
                {t('Admin.attentionNeeded', 'Attention Needed')}
              </Typography>
              <View style={[styles.statsGrid, rowDirectionStyle(isRtl)]}>
                {renderStatCard(
                  t('Admin.pending', 'Pending'), 
                  analytics?.verifications?.pendingReview ?? 0, 
                  colors.warning, 
                  'shield',
                  () => navigateToTarget('profile') // Profile handles pending verifications
                )}
                {renderStatCard(
                  t('Admin.activeIssues', 'Issues'), 
                  analytics?.issues?.new ?? 0, 
                  colors.error, 
                  'issues',
                  () => navigation.navigate('More', { screen: 'Issues' })
                )}
              </View>
            </View>

            <View style={styles.section}>
              <Typography variant="h3" style={[styles.sectionTitle, textDirectionStyle(isRtl)]}>
                {t('Admin.quickActions', 'Management Tools')}
              </Typography>
              <FlatList
                data={quickActions}
                keyExtractor={(action) => action.route}
                renderItem={renderQuickAction}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.quickActionsRail, rowDirectionStyle(isRtl)]}
              />
            </View>

            {/* Health Indicators */}
            <View style={styles.section}>
              <Typography variant="h3" style={[styles.sectionTitle, textDirectionStyle(isRtl)]}>
                {t('Admin.health')}
              </Typography>
              <View style={[styles.healthCard, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light, borderColor: isDark ? colors.border.dark : colors.border.light }, textDirectionStyle(isRtl)]}>
                <View style={[styles.healthRow, rowDirectionStyle(isRtl)]}>
                  <Typography variant="body" style={[styles.healthLabel, textDirectionStyle(isRtl)]}>{t('Admin.announcementReach')}</Typography>
                  <Typography variant="body" style={[styles.healthValue, textDirectionStyle(isRtl)]}>
                    {analytics?.announcements?.ackCount ?? 0} / {analytics?.announcements?.requiresAckCount ?? 0}
                  </Typography>
                </View>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${analytics?.announcements?.requiresAckCount ? (analytics.announcements.ackCount / analytics.announcements.requiresAckCount) * 100 : 0}%`,
                        backgroundColor: colors.primary.light,
                        alignSelf: isRtl ? 'flex-end' : 'flex-start'
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
  screen: {
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  scrollContent: {
    padding: layout.screenGutter,
    paddingBottom: layout.screenBottom,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: layout.sectionGap,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.text.secondary.light,
    marginTop: 2,
    fontWeight: '500',
  },
  profileButton: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
    ...shadows.sm,
  },
  heroContainer: {
    height: 140,
    marginBottom: layout.sectionGap,
    borderRadius: radii.xl,
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
    color: colors.text.inverse,
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
  },
  heroLabel: {
    color: colors.palette.ink[100],
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  heroDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: layout.sectionGap,
  },
  sectionTitle: {
    marginBottom: spacing.md,
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary.dark,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: layout.cardGap,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: layout.cardPadding,
    borderRadius: radii.xl,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
    ...shadows.sm,
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statLabel: {
    color: colors.text.secondary.light,
    fontSize: 11,
    fontWeight: '600',
  },
  quickActionsRail: {
    flexDirection: 'row',
    gap: layout.cardGap,
  },
  actionCard: {
    width: 112,
    minHeight: 120,
    paddingVertical: spacing.md,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
    ...shadows.sm,
  },
  actionIconBg: {
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceMuted.light,
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
    padding: layout.cardPadding,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border.light,
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
