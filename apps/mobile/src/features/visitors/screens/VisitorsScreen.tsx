import React, { useCallback, useEffect, useState } from 'react';
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
import { isRtlLanguage, rowDirectionStyle, textDirectionStyle } from '../../../i18n/direction';

export const VisitorsScreen = () => {
  const { t, i18n } = useTranslation();
  const isRtl = isRtlLanguage(i18n.language);
  const isDark = useColorScheme() === 'dark';
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  
  const user = useSelector(selectCurrentUser);
  const roleType = getEffectiveRoleType(user);
  const isAdmin = roleType === 'admin';
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

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.card, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light, borderColor: isDark ? colors.border.dark : colors.border.light }]}>
      <View style={[styles.cardHeader, rowDirectionStyle(isRtl)]}>
        <View style={[styles.titleRow, rowDirectionStyle(isRtl)]}>
          <View style={styles.iconBadge}>
            <Icon name="visitors" color={colors.primary.light} size={20} />
          </View>
          <Typography variant="h3" style={[styles.visitorName, textDirectionStyle(isRtl)]}>{item.visitorName}</Typography>
        </View>
        <View style={[styles.badgeRow, rowDirectionStyle(isRtl)]}>
          <Typography variant="label" style={textDirectionStyle(isRtl)}>{formatStatus(item.status)}</Typography>
          {item.sharedAt && (
            <View style={styles.sharedBadge}>
              <Typography variant="caption" style={[{ color: colors.primary.light, fontWeight: '600' }, textDirectionStyle(isRtl)]}>
                {t("Visitors.shared")}
              </Typography>
            </View>
          )}
        </View>
      </View>
      <Typography variant="caption" style={[styles.cardText, textDirectionStyle(isRtl)]}>{t("Visitors.visitStarts")}: {formatDate(item.visitStartsAt, i18n.language)}</Typography>
      <Typography variant="caption" style={[styles.cardText, textDirectionStyle(isRtl)]}>{t("Visitors.visitEnds")}: {formatDate(item.visitEndsAt, i18n.language)}</Typography>
      
      {item.status === 'pending' || item.status === 'qr_issued' ? (
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

  return (
    <ScreenContainer withKeyboard={false} style={styles.container}>
      <FlatList
        data={visitors}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshing={isLoading || (isFetching && page === 1)}
        onRefresh={refreshVisitors}
        onEndReached={loadMoreVisitors}
        onEndReachedThreshold={0.6}
        ListEmptyComponent={
          <View style={styles.center}>
            <Typography variant="caption" style={textDirectionStyle(isRtl)}>
              {isLoading ? t("Common.loading") : t("Visitors.empty")}
            </Typography>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
      {!isAdmin && (
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
    paddingTop: spacing.sm,
    paddingBottom: layout.screenBottom + 72,
  },
  card: {
    padding: spacing.ms,
    borderRadius: radii.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
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
    width: 36,
    height: 36,
    borderRadius: radii.sm,
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
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
