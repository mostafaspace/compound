import React from 'react';
import { View, StyleSheet, FlatList, useColorScheme } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useGetVisitorRequestsQuery, useCancelVisitorMutation } from '../../../services/property';
import { colors, spacing } from '../../../theme';
import { Button } from '../../../components/ui/Button';
import { Typography } from '../../../components/ui/Typography';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { formatDate, formatStatus } from '../../../utils/formatters';

export const VisitorsScreen = () => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  
  const { data: visitors = [], isLoading, refetch } = useGetVisitorRequestsQuery();
  const [cancelVisitor, { isLoading: isCancelling }] = useCancelVisitorMutation();

  const handleCancel = async (id: string) => {
    try {
      await cancelVisitor({ id, reason: "Cancelled by resident" }).unwrap();
    } catch (err) {
      console.error("Failed to cancel visitor", err);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.card, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light, borderColor: isDark ? colors.border.dark : colors.border.light }]}>
      <View style={styles.cardHeader}>
        <Typography variant="h3">{item.visitorName}</Typography>
        <Typography variant="label">{formatStatus(item.status)}</Typography>
      </View>
      <Typography variant="caption" style={styles.cardText}>{t("Visitors.visitStarts")}: {formatDate(item.visitStartsAt)}</Typography>
      <Typography variant="caption" style={styles.cardText}>{t("Visitors.visitEnds")}: {formatDate(item.visitEndsAt)}</Typography>
      
      {item.status === 'pending' && (
        <Button 
          variant="outline" 
          title={t("Visitors.cancel")} 
          onPress={() => handleCancel(item.id)}
          loading={isCancelling}
          style={styles.cancelButton}
          textStyle={{ color: colors.error }}
        />
      )}
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
          <View style={styles.center}>
            <Typography variant="caption">
              {isLoading ? t("Common.loading") : t("Visitors.empty")}
            </Typography>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 0, // Let FlatList handle padding
  },
  listContent: {
    padding: spacing.md,
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
  cardText: {
    marginBottom: 2,
  },
  cancelButton: {
    marginTop: spacing.sm,
    borderColor: colors.error,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  }
});
