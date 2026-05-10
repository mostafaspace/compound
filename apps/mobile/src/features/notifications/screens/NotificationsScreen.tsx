import React from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  useColorScheme,
  Pressable
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useGetNotificationsQuery, useMarkNotificationReadMutation, useArchiveNotificationMutation } from '../../../services/property';
import { colors, layout, radii, shadows, spacing } from '../../../theme';
import { Typography } from '../../../components/ui/Typography';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { formatDate } from '../../../utils/formatters';
import { Icon } from '../../../components/ui/Icon';
import type { RootStackParamList } from '../../../navigation/types';

type DeepLink = {
  screen?: string;
  params?: Record<string, unknown>;
  web?: string;
};

function getDeepLink(
  metadata: Record<string, unknown> | undefined | null,
  category?: string,
): DeepLink | null {
  const m = metadata ?? {};
  const dl = (m as { deep_link?: DeepLink }).deep_link;
  if (dl?.screen) return dl;

  const pollId = (m as Record<string, unknown>).poll_id ?? (m as Record<string, unknown>).pollId;
  if (pollId) return { screen: 'PollDetail', params: { pollId: String(pollId) } };
  const issue = (m as Record<string, unknown>).issue;
  if (issue) return { screen: 'IssueDetail', params: { issue } };

  // Category-level fallbacks
  switch (category) {
    case 'vehicles':
      return { screen: 'VehicleNotifyInbox' };
    case 'polls':
      return { screen: 'Main' };
    default:
      return null;
  }
}

export const NotificationsScreen = () => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const { data: notifications = [], isLoading, refetch } = useGetNotificationsQuery();
  const [markRead] = useMarkNotificationReadMutation();
  const [archive] = useArchiveNotificationMutation();

  const handlePress = async (item: { id: string | number; readAt: string | null; metadata?: Record<string, unknown> | null; category?: string }) => {
    if (!item.readAt) {
      try { await markRead(item.id).unwrap(); } catch { /* ignore */ }
    }
    const deepLink = getDeepLink(item.metadata ?? null, item.category);
    if (deepLink?.screen) {
      // @ts-expect-error - dynamic screen navigation
      navigation.navigate(deepLink.screen, deepLink.params ?? undefined);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <Pressable onPress={() => handlePress(item)} style={[
      styles.card,
      { backgroundColor: isDark ? colors.surface.dark : colors.surface.light, borderColor: isDark ? colors.border.dark : colors.border.light },
      !item.readAt && styles.unreadCard
    ]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.iconBadge}>
            <Icon name="notifications" color={colors.primary.light} size={20} />
          </View>
          <Typography variant="h3" style={styles.title}>{item.title}</Typography>
        </View>
        {!item.readAt && <View style={styles.unreadDot} />}
      </View>
      <Typography variant="body" style={styles.body}>{item.body}</Typography>
      <Typography variant="caption">{formatDate(item.createdAt)}</Typography>

      <View style={styles.actions}>
        {!item.readAt && (
          <Pressable onPress={() => markRead(item.id)}>
            <Typography variant="label" style={styles.actionText}>{t("Notifications.markRead")}</Typography>
          </Pressable>
        )}
        <Pressable onPress={() => archive(item.id)}>
          <Typography variant="label" style={[styles.actionText, { color: colors.error }]}>{t("Notifications.archive")}</Typography>
        </Pressable>
      </View>
    </Pressable>
  );

  return (
    <ScreenContainer style={styles.container}>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        refreshing={isLoading}
        onRefresh={refetch}
        ListEmptyComponent={
          <View style={styles.center}>
            <Typography variant="caption">
              {isLoading ? t("Common.loading") : t("Notifications.empty")}
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
    padding: 0,
  },
  listContent: {
    padding: layout.screenGutter,
    paddingBottom: layout.screenBottom,
  },
  card: {
    padding: layout.cardPadding,
    borderRadius: radii.xl,
    borderWidth: 1,
    marginBottom: layout.listGap,
    ...shadows.sm,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary.dark,
  },
  header: {
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
  title: {
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary.dark,
  },
  body: {
    color: colors.text.secondary.light,
    marginBottom: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.md,
    justifyContent: 'flex-end',
  },
  actionText: {
    color: colors.primary.dark,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  }
});
