import React from 'react';
import { View, StyleSheet, FlatList, useColorScheme } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import { getEffectiveRoleType } from '@compound/contracts';
import { selectCurrentUser } from '../../../store/authSlice';
import { useGetVisitorRequestsQuery, useCancelVisitorMutation } from '../../../services/property';
import { RootStackParamList } from '../../../navigation/types';
import { colors, layout, radii, shadows, spacing } from '../../../theme';
import { Button } from '../../../components/ui/Button';
import { Typography } from '../../../components/ui/Typography';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { formatDate, formatStatus } from '../../../utils/formatters';
import { Icon } from '../../../components/ui/Icon';

export const VisitorsScreen = () => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  
  const user = useSelector(selectCurrentUser);
  const roleType = getEffectiveRoleType(user);
  const isAdmin = roleType === 'admin';

  const { data: visitors = [], isLoading, refetch } = useGetVisitorRequestsQuery();
  const [cancelVisitor, { isLoading: isCancelling }] = useCancelVisitorMutation();

  // Refetch when screen comes into focus to catch new invitations
  useFocusEffect(
    React.useCallback(() => {
      refetch();
    }, [refetch])
  );

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
        <View style={styles.titleRow}>
          <View style={styles.iconBadge}>
            <Icon name="visitors" color={colors.primary.light} size={20} />
          </View>
          <Typography variant="h3" style={styles.visitorName}>{item.visitorName}</Typography>
        </View>
        <View style={styles.badgeRow}>
          <Typography variant="label">{formatStatus(item.status)}</Typography>
          {item.sharedAt && (
            <View style={styles.sharedBadge}>
              <Typography variant="caption" style={{ color: colors.primary.light, fontWeight: '600' }}>
                {t("Visitors.shared", { defaultValue: "Shared" })}
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
            leftIcon="qr"
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
      {!isAdmin && (
        <View style={styles.fabContainer}>
          <Button 
            title={t("Visitors.create", "New Visitor")} 
            onPress={() => navigation.navigate('CreateVisitor')}
            style={styles.fab}
            leftIcon="plus"
          />
        </View>
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 0, // Let FlatList handle padding
  },
  listContent: {
    padding: layout.screenGutter,
    paddingBottom: layout.screenBottom + 72,
  },
  card: {
    padding: layout.cardPadding,
    borderRadius: radii.xl,
    borderWidth: 1,
    marginBottom: layout.listGap,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted.light,
  },
  visitorName: {
    flex: 1,
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
    borderRadius: radii.sm,
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
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
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
    bottom: layout.fabInset,
    right: layout.fabInset,
    left: layout.fabInset,
  },
  fab: {
    borderRadius: radii.lg,
  }
});
