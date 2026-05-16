import React from "react";
import { FlatList, Pressable, StyleSheet, Text, useColorScheme, View } from "react-native";
import { useTranslation } from "react-i18next";
import { colors, layout, radii, spacing, typography } from "../../../../theme";
import {
  useListMyVehicleNotificationsQuery,
  useMarkVehicleNotificationReadMutation,
} from "../../../../services/apartments/vehicleNotificationsApi";
import { isRtlLanguage, textDirectionStyle } from "../../../../i18n/direction";
import { formatDate } from "../../../../utils/formatters";

export function VehicleNotifyInboxScreen() {
  const { t, i18n } = useTranslation();
  const isDark = useColorScheme() === "dark";
  const isRtl = isRtlLanguage(i18n.language);
  const text = colors.text.primary[isDark ? "dark" : "light"];
  const secondary = colors.text.secondary[isDark ? "dark" : "light"];
  const background = colors.background[isDark ? "dark" : "light"];
  const surface = colors.surface[isDark ? "dark" : "light"];
  const border = colors.border[isDark ? "dark" : "light"];

  const { data = [], isLoading, refetch } = useListMyVehicleNotificationsQuery();
  const [markRead] = useMarkVehicleNotificationReadMutation();

  const localizeSender = (label: string) => {
    if (label === 'Compound Management') return t('Common.management', { defaultValue: 'Compound Management' });
    return label;
  };

  return (
    <FlatList
      style={{ backgroundColor: background }}
      data={data}
      keyExtractor={(m) => String(m.id)}
      contentContainerStyle={[styles.list, { backgroundColor: background }]}
      refreshing={isLoading}
      onRefresh={refetch}
      ListEmptyComponent={
        <View style={[styles.empty, { backgroundColor: surface }, textDirectionStyle(isRtl)]}>
          <Text style={[styles.emptyTitle, { color: text }, textDirectionStyle(isRtl)]}>{t("VehicleNotify.inboxEmpty")}</Text>
          <Text style={[styles.emptyBody, { color: secondary }, textDirectionStyle(isRtl)]}>
            {t("VehicleNotify.inboxBody")}
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => {
            if (!item.readAt) markRead(item.id);
          }}
          style={[
            styles.card, 
            { backgroundColor: surface, borderColor: border, opacity: item.readAt ? 0.6 : 1 },
            isRtl ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }
          ]}
        >
          <Text style={[styles.sender, { color: text }, textDirectionStyle(isRtl)]}>{localizeSender(item.senderLabel)}</Text>
          <Text style={[styles.plate, { color: secondary }, textDirectionStyle(isRtl)]}>{t("VehicleNotify.plateLabel", { plate: item.plate })}</Text>
          <Text style={[styles.message, { color: text }, textDirectionStyle(isRtl)]}>{item.message}</Text>
          <Text style={[styles.time, { color: secondary }, textDirectionStyle(isRtl)]}>{formatDate(item.createdAt, i18n.language)}</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.md,
    flexGrow: 1,
    padding: layout.screenGutter,
    paddingBottom: layout.screenBottom,
  },
  card: {
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
  },
  sender: {
    ...typography.bodyStrong,
  },
  plate: {
    ...typography.caption,
    marginTop: spacing.xxs,
  },
  message: {
    ...typography.body,
    marginTop: spacing.sm,
  },
  time: {
    ...typography.caption,
    marginTop: spacing.sm,
  },
  empty: {
    borderRadius: radii.xl,
    padding: spacing.lg,
  },
  emptyTitle: {
    ...typography.h3,
  },
  emptyBody: {
    ...typography.body,
    marginTop: spacing.xs,
  },
});
