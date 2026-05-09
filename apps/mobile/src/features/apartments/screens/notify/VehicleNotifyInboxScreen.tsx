import React from "react";
import { FlatList, Pressable, StyleSheet, Text, useColorScheme, View } from "react-native";
import { colors, radii, spacing, typography } from "../../../../theme";
import {
  useListMyVehicleNotificationsQuery,
  useMarkVehicleNotificationReadMutation,
} from "../../../../services/apartments/vehicleNotificationsApi";

export function VehicleNotifyInboxScreen() {
  const isDark = useColorScheme() === "dark";
  const text = colors.text.primary[isDark ? "dark" : "light"];
  const secondary = colors.text.secondary[isDark ? "dark" : "light"];
  const surface = colors.surface[isDark ? "dark" : "light"];

  const { data = [] } = useListMyVehicleNotificationsQuery();
  const [markRead] = useMarkVehicleNotificationReadMutation();

  return (
    <FlatList
      data={data}
      keyExtractor={(m) => String(m.id)}
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <View style={[styles.empty, { backgroundColor: surface }]}>
          <Text style={[styles.emptyTitle, { color: text }]}>No vehicle messages yet</Text>
          <Text style={[styles.emptyBody, { color: secondary }]}>
            When someone sends a message about your vehicle, it will appear here.
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => {
            if (!item.readAt) markRead(item.id);
          }}
          style={[styles.card, { backgroundColor: surface, opacity: item.readAt ? 0.6 : 1 }]}
        >
          <Text style={[styles.sender, { color: text }]}>{item.senderLabel}</Text>
          <Text style={[styles.plate, { color: secondary }]}>Plate: {item.plate}</Text>
          <Text style={[styles.message, { color: text }]}>{item.message}</Text>
          <Text style={[styles.time, { color: secondary }]}>{item.createdAt}</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.md,
    padding: spacing.md,
    paddingBottom: 96,
  },
  card: {
    borderRadius: radii.lg,
    padding: spacing.md,
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
