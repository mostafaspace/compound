import React from 'react';
import { View, StyleSheet, FlatList, useColorScheme } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useGetVisitorRequestsQuery, useCancelVisitorMutation } from '../../../services/property';
import { RootStackParamList } from '../../../navigation/types';
import { colors, spacing } from '../../../theme';
import { Button } from '../../../components/ui/Button';
import { Typography } from '../../../components/ui/Typography';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { formatDate, formatStatus } from '../../../utils/formatters';

export const VisitorsScreen = () => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  
  const { data: visitors = [], isLoading, refetch } = useGetVisitorRequestsQuery();
  const [cancelVisitor, { isLoading: isCancelling }] = useCancelVisitorMutation();

  const handleCancel = async (id: string) => {
    try {
      await cancelVisitor({ id, reason: "Cancelled by resident" }).unwrap();
    } catch (err) {
      console.error("Failed to cancel visitor", err);
    }
  };

  const handleShare = (item: any) => {
    navigation.navigate('ShareVisitorPass', { visitorId: item.id });
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.card, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light, borderColor: isDark ? colors.border.dark : colors.border.light }]}>
      <View style={styles.cardHeader}>
        <Typography variant="h3">{item.visitorName}</Typography>
        <View style={styles.badgeRow}>
          <Typography variant="label">{formatStatus(item.status)}</Typography>
          {item.sharedAt && (
            <View style={styles.sharedBadge}>
              <Typography variant="caption" style={{ color: colors.primary.light, fontWeight: '600' }}>
                ✓ Shared
              </Typography>
            </View>
          )}
        </View>
      </View>
      <Typography variant="caption" style={styles.cardText}>{t("Visitors.visitStarts")}: {formatDate(item.visitStartsAt)}</Typography>
      <Typography variant="caption" style={styles.cardText}>{t("Visitors.visitEnds")}: {formatDate(item.visitEndsAt)}</Typography>
      
      {item.status === 'pending' || item.status === 'qr_issued' ? (
        <View style={styles.actionButtons}>
          <Button 
            variant="primary" 
            title={t("Visitors.share", "Share Pass")} 
            onPress={() => handleShare(item)}
            style={styles.actionButton}
            textStyle={{ fontSize: 14 }}
          />
          <Button 
            variant="ghost" 
            title={t("Visitors.cancel", "Cancel")} 
            onPress={() => handleCancel(item.id)}
            loading={isCancelling}
            style={[styles.actionButton, styles.cancelButton]}
            textStyle={{ color: colors.error, fontSize: 14 }}
          />
        </View>
      ) : null}
    </View>
  );

  return (
    <ScreenContainer withKeyboard={false} style={styles.container} edges={['left', 'right']}>
      <FlatList
        data={visitors}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshing={isLoading}
        onRefresh={refetch}
        ListEmptyComponent={
          <View style={styles.center}>
            <Typography variant="caption">
              {isLoading ? t("Common.loading") : t("Visitors.empty")}
            </Typography>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
      <View style={styles.fabContainer}>
        <Button 
          title={t("Visitors.create", "New Visitor")} 
          onPress={() => navigation.navigate('CreateVisitor')}
          style={styles.fab}
        />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 0, // Let FlatList handle padding
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: 100, // Make room for the FAB
  },
  card: {
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sharedBadge: {
    backgroundColor: colors.primary.light + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cardText: {
    marginBottom: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  actionButton: {
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
  },
  cancelButton: {
    borderColor: colors.error,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  fabContainer: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    left: spacing.lg,
  },
  fab: {
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  }
});
