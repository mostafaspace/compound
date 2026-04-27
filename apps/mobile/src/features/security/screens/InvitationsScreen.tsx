import React from 'react';
import { View, StyleSheet, FlatList, useColorScheme } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useGetPendingVisitorRequestsQuery, usePerformVisitorActionMutation } from '../../../services/security';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { Typography } from '../../../components/ui/Typography';
import { Button } from '../../../components/ui/Button';
import { colors, spacing, shadows } from '../../../theme';
import { formatDate } from '../../../utils/formatters';

export const InvitationsScreen = () => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';

  const { data: visitors = [], isLoading, refetch } = useGetPendingVisitorRequestsQuery();
  const [performAction, { isLoading: isPerforming }] = usePerformVisitorActionMutation();

  const handleAction = async (id: string, action: string) => {
    try {
      await performAction({ id, action }).unwrap();
      refetch();
    } catch (err: any) {
      console.error(`Failed to ${action} visitor`, err);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? colors.surface.dark : colors.surface.light,
          borderColor: isDark ? colors.border.dark : colors.border.light,
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.visitorInfo}>
          <Typography variant="h3">{item.visitorName}</Typography>
          <Typography variant="caption" style={styles.unitText}>
            {item.unit?.unitNumber && `Unit ${item.unit.unitNumber}`}
            {item.unit?.buildingName && ` • ${item.unit.buildingName}`}
          </Typography>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Typography variant="caption" style={{ color: '#FFF', fontWeight: '600' }}>
            {item.status}
          </Typography>
        </View>
      </View>

      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Typography variant="caption" style={styles.detailLabel}>
            {t('Security.expected', 'Expected')}
          </Typography>
          <Typography variant="body" style={styles.detailValue}>
            {formatDate(item.visitStartsAt)}
          </Typography>
        </View>
        <View style={styles.detailItem}>
          <Typography variant="caption" style={styles.detailLabel}>
            {t('Security.guests', 'Guests')}
          </Typography>
          <Typography variant="body" style={styles.detailValue}>
            {item.numberOfVisitors || 1}
          </Typography>
        </View>
        {item.sharedAt && (
          <View style={styles.detailItem}>
            <Typography variant="caption" style={styles.detailLabel}>
              {t('Security.shared', 'Shared')}
            </Typography>
            <Typography variant="body" style={[styles.detailValue, { color: colors.success }]}>
              ✓ {formatDate(item.sharedAt)}
            </Typography>
          </View>
        )}
      </View>

      <View style={styles.actionRow}>
        <Button
          title={t('Security.markArrived', 'Mark Arrived')}
          onPress={() => handleAction(item.id, 'arrive')}
          style={[styles.actionBtn, { flex: 1 }]}
          loading={isPerforming}
        />
        <Button
          title={t('Security.allow', 'Allow')}
          onPress={() => handleAction(item.id, 'allow')}
          style={[styles.actionBtn, styles.allowBtn, { flex: 1 }]}
          loading={isPerforming}
        />
        <Button
          variant="outline"
          title={t('Security.deny', 'Deny')}
          onPress={() => handleAction(item.id, 'deny')}
          style={[styles.actionBtn, styles.denyBtn, { flex: 1 }]}
          textStyle={{ color: colors.error }}
          loading={isPerforming}
        />
      </View>
    </View>
  );

  return (
    <ScreenContainer withKeyboard={false} style={styles.container}>
      <FlatList
        data={visitors}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshing={isLoading}
        onRefresh={refetch}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Typography style={{ fontSize: 48 }}>📋</Typography>
            <Typography variant="h3" style={styles.emptyTitle}>
              {t('Security.noPending', 'No Pending Invitations')}
            </Typography>
            <Typography variant="caption" style={styles.emptyText}>
              {t('Security.noPendingDesc', 'All visitors have been processed')}
            </Typography>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </ScreenContainer>
  );
};

function getStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return colors.warning;
    case 'qr_issued':
      return colors.primary.light;
    case 'arrived':
      return colors.info;
    default:
      return colors.text.secondary.light;
  }
}

const styles = StyleSheet.create({
  container: {
    padding: 0,
  },
  listContent: {
    padding: spacing.md,
  },
  card: {
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  visitorInfo: {
    flex: 1,
  },
  unitText: {
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    marginBottom: 2,
  },
  detailValue: {
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    height: 40,
  },
  allowBtn: {
    backgroundColor: colors.success,
  },
  denyBtn: {
    borderColor: colors.error,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyText: {
    textAlign: 'center',
  },
});
