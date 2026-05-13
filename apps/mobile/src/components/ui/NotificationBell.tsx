import React from "react";
import { Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { Icon } from "./Icon";
import { colors, spacing, typography } from "../../theme";
import { useGetNotificationsQuery } from "../../services/property";
import type { RootStackParamList } from "../../navigation/types";

export function NotificationBell() {
  const isDark = useColorScheme() === "dark";
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { data: notifications = [] } = useGetNotificationsQuery();
  const unread = notifications.filter((n) => !n.readAt).length;
  const tint = isDark ? colors.text.primary.dark : colors.text.primary.light;

  return (
    <Pressable
      onPress={() => navigation.navigate("NotificationsCenter")}
      style={styles.btn}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Notifications"
    >
      <Icon name="notifications" color={tint} size={22} />
      {unread > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unread > 99 ? "99+" : String(unread)}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: 0,
    end: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.error,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    ...typography.caption,
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
});
