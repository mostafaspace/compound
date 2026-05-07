import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { Typography } from '../../../components/ui/Typography';
import { layout, spacing } from '../../../theme';
import { ActionTile } from '../../../components/ui/ActionTile';

/**
 * Resident dashboard - shows unit info, upcoming visitors, payments, etc.
 * This is the main screen for resident_owner and resident_tenant roles.
 */
export const ResidentDashboardScreen = () => {
  const { t } = useTranslation();

  return (
    <ScreenContainer style={styles.container}>
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
          <ActionTile title={t('Visitors.label', 'Visitors')} icon="visitors" />
          <ActionTile title={t('Finance.label', 'Finance')} icon="finance" tone="info" />
          <ActionTile title={t('Resident.maintenance', 'Maintenance')} icon="issues" tone="warning" />
          <ActionTile title={t('Resident.announcements', 'Announcements')} icon="polls" tone="success" />
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
    padding: layout.screenGutter,
  },
  header: {
    marginBottom: layout.sectionGap,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
  section: {
    marginBottom: layout.sectionGap,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  placeholderText: {
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
});
