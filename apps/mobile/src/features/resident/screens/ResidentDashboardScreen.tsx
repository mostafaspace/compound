import React from 'react';
import { View, StyleSheet, useColorScheme } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { Typography } from '../../../components/ui/Typography';
import { colors, spacing } from '../../../theme';

/**
 * Resident dashboard - shows unit info, upcoming visitors, payments, etc.
 * This is the main screen for resident_owner and resident_tenant roles.
 */
export const ResidentDashboardScreen = () => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';

  return (
    <ScreenContainer style={styles.container} edges={['left', 'right']}>
      <View style={styles.header}>
        <Typography variant="h1">
          {t('Dashboard.title', { defaultValue: 'Dashboard' })}
        </Typography>
        <Typography variant="caption" style={styles.subtitle}>
          {t('Resident.welcome', 'Welcome back')}
        </Typography>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Typography variant="h2" style={styles.sectionTitle}>
          {t('Resident.quickActions', 'Quick Actions')}
        </Typography>
        <View style={styles.quickActionsGrid}>
          <View style={[styles.actionCard, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light }]}>
            <Typography style={styles.actionGlyph}>VI</Typography>
            <Typography variant="body" style={styles.actionLabel}>
              {t('Visitors.label', 'Visitors')}
            </Typography>
          </View>
          <View style={[styles.actionCard, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light }]}>
            <Typography style={styles.actionGlyph}>FN</Typography>
            <Typography variant="body" style={styles.actionLabel}>
              {t('Finance.label', 'Finance')}
            </Typography>
          </View>
          <View style={[styles.actionCard, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light }]}>
            <Typography style={styles.actionGlyph}>IS</Typography>
            <Typography variant="body" style={styles.actionLabel}>
              {t('Resident.maintenance', 'Maintenance')}
            </Typography>
          </View>
          <View style={[styles.actionCard, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light }]}>
            <Typography style={styles.actionGlyph}>AN</Typography>
            <Typography variant="body" style={styles.actionLabel}>
              {t('Resident.announcements', 'Announcements')}
            </Typography>
          </View>
        </View>
      </View>

      {/* Upcoming Visitors */}
      <View style={styles.section}>
        <Typography variant="h2" style={styles.sectionTitle}>
          {t('Resident.upcomingVisitors', 'Upcoming Visitors')}
        </Typography>
        <Typography variant="caption" style={styles.placeholderText}>
          {t('Resident.noUpcoming', 'No upcoming visitors')}
        </Typography>
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
  actionGlyph: {
    color: colors.primary.light,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
  actionLabel: {
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  placeholderText: {
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
});
