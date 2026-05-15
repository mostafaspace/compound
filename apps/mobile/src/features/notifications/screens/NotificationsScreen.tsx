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
import { isRtlLanguage, rowDirectionStyle, textDirectionStyle } from '../../../i18n/direction';

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

function getLocalizedNotification(item: {
  title?: string;
  body?: string;
  metadata?: Record<string, unknown> | null;
}, t: ReturnType<typeof useTranslation>["t"], language: string): { title: string; body: string } {
  const metadata = item.metadata ?? {};
  const locale = language.startsWith("ar") ? "ar" : "en";
  const titleTranslations = metadata.titleTranslations as Record<string, string> | undefined;
  const bodyTranslations = metadata.bodyTranslations as Record<string, string> | undefined;

  if (titleTranslations?.[locale] || bodyTranslations?.[locale]) {
    return {
      title: titleTranslations?.[locale] ?? item.title ?? t("Notifications.label", { defaultValue: "Notifications" }),
      body: bodyTranslations?.[locale] ?? item.body ?? "",
    };
  }

  const type = typeof metadata.type === "string" ? metadata.type : null;
  const apartmentCode = typeof metadata.apartment_code === "string"
    ? metadata.apartment_code
    : item.body?.match(/for\s+([A-Z0-9/-]+)\s+has/i)?.[1];

  if (type === "owner_registration_approved" || item.title === "Owner registration approved") {
    return {
      title: t("Notifications.ownerRegistration.approvedTitle", { defaultValue: "Owner registration approved" }),
      body: t("Notifications.ownerRegistration.approvedBody", {
        apartmentCode: apartmentCode ?? t("Common.unit", { defaultValue: "your unit" }),
        defaultValue: "Your registration for {{apartmentCode}} has been approved. You can now sign in.",
      }),
    };
  }

  const visitorName = item.body?.split(" ")[0] ?? t("Notifications.visitors.guest", { defaultValue: "Your guest" });
  const visitorFallbacks: Record<string, { title: string; body: string }> = {
    "Visitor arrived": {
      title: t("Notifications.visitors.arrivedTitle", { defaultValue: "Visitor arrived" }),
      body: t("Notifications.visitors.arrivedBody", {
        visitorName,
        defaultValue: "{{visitorName}} arrived at the gate.",
      }),
    },
    "Visitor allowed": {
      title: t("Notifications.visitors.allowedTitle", { defaultValue: "Visitor allowed" }),
      body: t("Notifications.visitors.allowedBody", {
        visitorName,
        defaultValue: "{{visitorName}} was allowed entry.",
      }),
    },
    "Visitor denied": {
      title: t("Notifications.visitors.deniedTitle", { defaultValue: "Visitor denied" }),
      body: t("Notifications.visitors.deniedBody", {
        visitorName,
        defaultValue: "{{visitorName}} was denied entry.",
      }),
    },
    "Visit completed": {
      title: t("Notifications.visitors.completedTitle", { defaultValue: "Visit completed" }),
      body: t("Notifications.visitors.completedBody", {
        visitorName,
        defaultValue: "{{visitorName}}'s visit was completed.",
      }),
    },
    "Visitor pass issued": {
      title: t("Notifications.visitors.issuedTitle", { defaultValue: "Visitor pass issued" }),
      body: t("Notifications.visitors.issuedBody", {
        visitorName,
        defaultValue: "{{visitorName}} is expected at the gate.",
      }),
    },
  };

  if (item.title && visitorFallbacks[item.title]) {
    return visitorFallbacks[item.title];
  }

  return {
    title: item.title ?? t("Notifications.label", { defaultValue: "Notifications" }),
    body: item.body ?? "",
  };
}

export const NotificationsScreen = () => {
  const { t, i18n } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const isRtl = isRtlLanguage(i18n.language);
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

  const renderItem = ({ item }: { item: any }) => {
    const localized = getLocalizedNotification(item, t, i18n.language);
    const bodyColor = isDark ? colors.text.secondary.dark : colors.text.secondary.light;

    return (
      <Pressable onPress={() => handlePress(item)} style={[
        styles.card,
        { backgroundColor: isDark ? colors.surface.dark : colors.surface.light, borderColor: isDark ? colors.border.dark : colors.border.light },
        !item.readAt && styles.unreadCard
      ]}>
        <View style={[styles.header, rowDirectionStyle(isRtl)]}>
          <View style={[styles.titleRow, rowDirectionStyle(isRtl)]}>
            <View style={styles.iconBadge}>
              <Icon name="notifications" color={colors.primary.light} size={20} />
            </View>
            <Typography variant="h3" style={[styles.title, textDirectionStyle(isRtl)]}>{localized.title}</Typography>
          </View>
          {!item.readAt && <View style={styles.unreadDot} />}
        </View>
        <Typography variant="body" style={[styles.body, { color: bodyColor }, textDirectionStyle(isRtl)]}>{localized.body}</Typography>
        <Typography variant="caption" style={textDirectionStyle(isRtl)}>{formatDate(item.createdAt, i18n.language === 'ar' ? 'ar-EG' : 'en-US')}</Typography>

        <View style={[styles.actions, rowDirectionStyle(isRtl), { justifyContent: isRtl ? 'flex-start' : 'flex-end' }]}>
          {!item.readAt && (
            <Pressable onPress={() => markRead(item.id)}>
              <Typography variant="label" style={[styles.actionText, textDirectionStyle(isRtl)]}>{t("Notifications.markRead")}</Typography>
            </Pressable>
          )}
          <Pressable onPress={() => archive(item.id)}>
            <Typography variant="label" style={[styles.actionText, { color: colors.error }, textDirectionStyle(isRtl)]}>{t("Notifications.archive")}</Typography>
          </Pressable>
        </View>
      </Pressable>
    );
  };

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
    borderStartWidth: 4,
    borderStartColor: colors.primary.dark,
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
