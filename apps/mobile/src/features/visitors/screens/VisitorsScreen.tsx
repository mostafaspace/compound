import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet, FlatList, useColorScheme } from 'react-native';
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
import { Icon } from '../../../components/ui/Icon';
import { isRtlLanguage, rowDirectionStyle, textDirectionStyle } from '../../../i18n/direction';

export const VisitorsScreen = () => {
  const { t, i18n } = useTranslation();
  const isRtl = isRtlLanguage(i18n.language);
  const isDark = useColorScheme() === 'dark';
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const user = useSelector(selectCurrentUser);
  const roleType = getEffectiveRoleType(user);
  const canValidateVisitors = roleType === 'admin' || roleType === 'security';
  const canCreateVisitors = !canValidateVisitors;
  const [page, setPage] = useState(1);
  const [visitors, setVisitors] = useState<any[]>([]);

  const { data: visitorPage, isFetching, isLoading, refetch } = useGetVisitorRequestsQuery({ page, perPage: 20 });
  const [cancelVisitor, { isLoading: isCancelling }] = useCancelVisitorMutation();
  const hasMore = Boolean(visitorPage && visitorPage.meta.current_page < visitorPage.meta.last_page);

  useEffect(() => {
    if (!visitorPage) {
      return;
    }

    setVisitors((current) => {
      if (visitorPage.meta.current_page === 1) {
        return visitorPage.data;
      }

      const next = [...current];
      const seenIds = new Set<string>();
      for (let index = 0; index < current.length; index += 1) {
        seenIds.add(current[index].id);
      }

      for (let index = 0; index < visitorPage.data.length; index += 1) {
        const visitor = visitorPage.data[index];
        if (!seenIds.has(visitor.id)) {
          next.push(visitor);
        }
      }

      return next;
    });
  }, [visitorPage]);

  const refreshVisitors = useCallback(() => {
    if (page === 1) {
      void refetch();
      return;
    }

    setPage(1);
  }, [page, refetch]);

  const loadMoreVisitors = useCallback(() => {
    if (!hasMore || isFetching) {
      return;
    }

    setPage((current) => current + 1);
  }, [hasMore, isFetching]);

  // Refetch when screen comes into focus to catch new invitations
  useFocusEffect(
    useCallback(() => {
      refreshVisitors();
    }, [refreshVisitors])
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

  const getVisitorStatusLabel = useCallback(
    (status: string) => t(`Visitors.statuses.${status}`, { defaultValue: status.replaceAll('_', ' ') }),
    [t],
  );

  const surfaceColor = isDark ? colors.surface.dark : colors.surface.light;
  const mutedSurfaceColor = isDark ? colors.surfaceMuted.dark : colors.surfaceMuted.light;
  const borderColor = isDark ? colors.border.dark : colors.border.light;
  const secondaryText = isDark ? colors.text.secondary.dark : colors.text.secondary.light;

  const renderItem = ({ item }: { item: any }) => {
    const isActionable = item.status === 'pending' || item.status === 'qr_issued';
    const guestCount = Number(item.numberOfVisitors ?? 1);

    return (
      <View style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}>
        <View style={[styles.cardHeader, rowDirectionStyle(isRtl)]}>
          <View style={[styles.titleRow, rowDirectionStyle(isRtl)]}>
            <View style={[styles.iconBadge, { backgroundColor: mutedSurfaceColor }]}>
              <Icon name="visitors" color={colors.primary.light} size={20} />
            </View>
            <View style={styles.titleCopy}>
              <Typography variant="h3" style={[styles.visitorName, textDirectionStyle(isRtl)]}>
                {item.visitorName}
              </Typography>
              <Typography variant="caption" color="secondary" style={textDirectionStyle(isRtl)}>
                {t("Visitors.passReadyHint")}
              </Typography>
            </View>
          </View>
          <View style={[styles.statusPill, rowDirectionStyle(isRtl)]}>
            <View style={styles.statusDot} />
            <Typography variant="label" style={[styles.statusText, textDirectionStyle(isRtl)]}>
              {getVisitorStatusLabel(item.status)}
            </Typography>
          </View>
        </View>

        {(guestCount > 1 || item.vehiclePlate || item.sharedAt) && (
          <View style={[styles.metaRow, rowDirectionStyle(isRtl)]}>
            {guestCount > 1 ? (
              <View style={[styles.metaPill, { backgroundColor: mutedSurfaceColor }]}>
                <Typography variant="caption" style={textDirectionStyle(isRtl)}>
                  {t("Visitors.guestsCount")}: {guestCount}
                </Typography>
              </View>
            ) : null}
            {item.vehiclePlate ? (
              <View style={[styles.metaPill, { backgroundColor: mutedSurfaceColor }]}>
                <Typography variant="caption" style={textDirectionStyle(isRtl)}>
                  {t("Visitors.vehicle", { vehicle: item.vehiclePlate })}
                </Typography>
              </View>
            ) : null}
            {item.sharedAt ? (
              <View style={styles.sharedBadge}>
                <Typography variant="caption" style={[{ color: colors.primary.light, fontWeight: '700' }, textDirectionStyle(isRtl)]}>
                  {t("Visitors.shared")}
                </Typography>
              </View>
            ) : null}
          </View>
        )}

        {canCreateVisitors && isActionable ? (
          <View style={[styles.actionButtons, rowDirectionStyle(isRtl)]}>
            <Button
              variant="primary"
              title={t("Visitors.share")}
              onPress={() => handleShare(item)}
              style={styles.actionButton}
              leftIcon="qr"
              textStyle={[{ fontSize: 14 }, textDirectionStyle(isRtl)]}
            />
            <Button
              variant="ghost"
              title={t("Visitors.cancel")}
              onPress={() => handleCancel(item.id)}
              loading={isCancelling}
              style={[styles.actionButton, styles.cancelButton]}
              textStyle={[{ color: colors.error, fontSize: 14 }, textDirectionStyle(isRtl)]}
            />
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <ScreenContainer withKeyboard={false} style={styles.container}>
      <FlatList
        style={styles.list}
        data={visitors}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        refreshing={isLoading || (isFetching && page === 1)}
        onRefresh={refreshVisitors}
        onEndReached={loadMoreVisitors}
        onEndReachedThreshold={0.6}
        ListHeaderComponent={
          <View style={[styles.headerCard, { backgroundColor: surfaceColor, borderColor }, textDirectionStyle(isRtl)]}>
            <Typography variant="label" style={[styles.eyebrow, textDirectionStyle(isRtl)]}>
              {t("Visitors.label")}
            </Typography>
            <Typography variant="h2" style={[styles.headerTitle, textDirectionStyle(isRtl)]}>
              {t(canValidateVisitors ? "Visitors.title" : "Visitors.residentTitle")}
            </Typography>
            <Typography variant="body" style={[styles.headerSubtitle, { color: secondaryText }, textDirectionStyle(isRtl)]}>
              {t(canValidateVisitors ? "Visitors.subtitle" : "Visitors.residentSubtitle")}
            </Typography>
          </View>
        }
        ListEmptyComponent={
          <View style={[styles.emptyCard, { backgroundColor: surfaceColor, borderColor }, textDirectionStyle(isRtl)]}>
            {isLoading ? (
              <ActivityIndicator color={colors.primary.light} />
            ) : (
              <>
                <View style={[styles.emptyIcon, { backgroundColor: mutedSurfaceColor }]}>
                  <Icon name="qr" color={colors.primary.light} size={24} />
                </View>
                <Typography variant="h3" style={textDirectionStyle(isRtl)}>
                  {t("Visitors.empty")}
                </Typography>
                <Typography variant="body" style={[styles.emptyText, { color: secondaryText }, textDirectionStyle(isRtl)]}>
                  {t("Visitors.recent")}
                </Typography>
              </>
            )}
          </View>
        }
        ListFooterComponent={
          isFetching && page > 1 ? (
            <ActivityIndicator color={colors.primary.light} style={styles.footerLoader} />
          ) : null
        }
        contentContainerStyle={styles.listContent}
      />
      {canCreateVisitors && (
        <View style={styles.fabContainer}>
          <Button
            title={t("Visitors.create")}
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
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  listContent: {
    paddingHorizontal: layout.screenGutter,
    paddingTop: spacing.md,
    paddingBottom: layout.screenBottom + 72,
  },
  list: {
    flex: 1,
  },
  headerCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  eyebrow: {
    color: colors.primary.light,
    marginBottom: spacing.xs,
  },
  headerTitle: {
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    lineHeight: 24,
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
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visitorName: {
    marginBottom: 2,
  },
  titleCopy: {
    flex: 1,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.primary.light + '18',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: 32,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary.light,
  },
  statusText: {
    color: colors.primary.light,
    fontSize: 11,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  metaPill: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  sharedBadge: {
    backgroundColor: colors.primary.light + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  actionButton: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
  },
  cancelButton: {
    borderColor: colors.error,
  },
  emptyCard: {
    alignItems: 'center',
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: layout.heroPadding,
    ...shadows.sm,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyText: {
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  footerLoader: {
    marginVertical: spacing.md,
  },
  fabContainer: {
    position: 'absolute',
    bottom: layout.fabInset,
    end: layout.fabInset,
    start: layout.fabInset,
  },
  fab: {
    borderRadius: radii.lg,
  }
});
