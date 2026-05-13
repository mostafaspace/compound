import React from 'react';
import { View, StyleSheet, FlatList, useColorScheme } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useGetPendingVisitorRequestsQuery, usePerformVisitorActionMutation } from '../../../services/security';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { Typography } from '../../../components/ui/Typography';
import { Button } from '../../../components/ui/Button';
import { colors, spacing, shadows } from '../../../theme';
import { visitorStatusPalette } from '../../../theme/semantics';
import { formatDate } from '../../../utils/formatters';
import { Icon } from '../../../components/ui/Icon';
import { Card } from '../../../components/ui/Card';
import { isRtlLanguage, rowDirectionStyle, textDirectionStyle } from '../../../i18n/direction';

export const InvitationsScreen = () => {
  const { t, i18n } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const isRtl = isRtlLanguage(i18n.language);

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

  const renderActions = (item: any) => {
    if (item.status === 'allowed') {
      return (
        <View style={[styles.actionRow, rowDirectionStyle(isRtl)]}>
          <Button
            title={t('Security.complete')}
            onPress={() => handleAction(item.id, 'complete')}
            variant="primary"
            style={[styles.actionButton, { flex: 1 }]}
            loading={isPerforming}
          />
        </View>
      );
    }

    return (
      <View style={[styles.actionRow, rowDirectionStyle(isRtl)]}>
        {item.status !== 'arrived' ? (
          <Button
            title={t('Security.markArrived')}
            onPress={() => handleAction(item.id, 'arrive')}
            variant="outline"
            style={[styles.actionButton, { flex: 1 }]}
            loading={isPerforming}
          />
        ) : null}
        <Button
          title={t('Security.allow')}
          onPress={() => handleAction(item.id, 'allow')}
          variant="success"
          style={[styles.actionButton, { flex: 1 }]}
          loading={isPerforming}
        />
        <Button
          variant="outline"
          title={t('Security.deny')}
          onPress={() => handleAction(item.id, 'deny')}
          style={[styles.actionButton, { flex: 1, borderColor: colors.error }]}
          textStyle={{ color: colors.error }}
          loading={isPerforming}
        />
      </View>
    );
  };

  const renderItem = ({ item }: { item: any }) => (
    <Card style={{ marginBottom: spacing.md }}>
      <View style={[styles.cardHeader, rowDirectionStyle(isRtl)]}>
        <View style={[styles.visitorInfo, textDirectionStyle(isRtl)]}>
          <Typography variant="h3" style={textDirectionStyle(isRtl)}>{item.visitorName}</Typography>
          <Typography variant="caption" style={[styles.unitText, textDirectionStyle(isRtl)]}>
            {item.unit?.unitNumber && t('Apartments.unitNumber', { number: item.unit.unitNumber })}
            {item.unit?.buildingName && ` • ${item.unit.buildingName}`}
          </Typography>
        </View>
        <StatusBadge
          label={t(`Common.statuses.${item.status}`, { defaultValue: item.status.replace(/_/g, ' ') })}
          backgroundColor={visitorStatusPalette(item.status).background}
          textColor={visitorStatusPalette(item.status).text}
        />
      </View>

      <View style={[styles.detailsRow, rowDirectionStyle(isRtl)]}>
        <View style={[styles.detailItem, textDirectionStyle(isRtl)]}>
          <Typography variant="caption" style={[styles.detailLabel, textDirectionStyle(isRtl)]}>
            {t('Security.expected')}
          </Typography>
          <Typography variant="body" style={[styles.detailValue, textDirectionStyle(isRtl)]}>
            {formatDate(item.visitStartsAt, i18n.language === 'ar' ? 'ar-EG' : 'en-US')}
          </Typography>
        </View>
        <View style={[styles.detailItem, textDirectionStyle(isRtl)]}>
          <Typography variant="caption" style={[styles.detailLabel, textDirectionStyle(isRtl)]}>
            {t('Security.guests')}
          </Typography>
          <Typography variant="body" style={[styles.detailValue, textDirectionStyle(isRtl)]}>
            {item.numberOfVisitors || 1}
          </Typography>
        </View>
        {item.sharedAt && (
          <View style={[styles.detailItem, textDirectionStyle(isRtl)]}>
            <Typography variant="caption" style={[styles.detailLabel, textDirectionStyle(isRtl)]}>
              {t('Security.shared')}
            </Typography>
            <Typography variant="body" style={[styles.detailValue, { color: colors.success }, textDirectionStyle(isRtl)]}>
              ✓ {formatDate(item.sharedAt, i18n.language === 'ar' ? 'ar-EG' : 'en-US')}
            </Typography>
          </View>
        )}
      </View>

      {renderActions(item)}
    </Card>
  );

  return (
    <ScreenContainer withKeyboard={false}>
      <FlatList
        data={visitors}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshing={isLoading}
        onRefresh={refetch}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="visitors" color={colors.primary.light} size={40} />
            <Typography variant="h3" style={styles.emptyTitle}>
              {t('Security.noPending')}
            </Typography>
            <Typography variant="caption" style={styles.emptyText}>
              {t('Security.noPendingDesc')}
            </Typography>
          </View>
        }
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
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
    gap: spacing.md,
  },
  actionButton: {
    paddingHorizontal: spacing.sm,
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
