import React from "react";
import { ScrollView, StyleSheet, View, useColorScheme } from "react-native";
import { RouteProp, useRoute } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { ScreenContainer } from "../../../components/layout/ScreenContainer";
import { Typography } from "../../../components/ui/Typography";
import { RootStackParamList } from "../../../navigation/types";
import { colors, spacing } from "../../../theme";

const priorityColors: Record<string, string> = {
  urgent: "#ef4444",
  high: "#f97316",
  normal: "#3b82f6",
  low: "#6b7280",
};

const statusColors: Record<string, string> = {
  new: "#3b82f6",
  in_progress: "#f97316",
  escalated: "#ef4444",
  resolved: "#22c55e",
  closed: "#6b7280",
};

export const IssueDetailScreen = () => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === "dark";
  const route = useRoute<RouteProp<RootStackParamList, "IssueDetail">>();
  const { issue } = route.params;

  const surface = isDark ? colors.surface.dark : colors.surface.light;
  const border = isDark ? colors.border.dark : colors.border.light;
  const text = isDark ? colors.text.primary.dark : colors.text.primary.light;
  const subtext = "#6b7280";

  return (
    <ScreenContainer withKeyboard={false} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
          <View style={styles.headerRow}>
            <View style={[styles.badge, { backgroundColor: statusColors[issue.status] ?? "#6b7280" }]}>
              <Typography variant="caption" style={styles.badgeText}>
                {t(`Issues.statuses.${issue.status}`, { defaultValue: issue.status })}
              </Typography>
            </View>
            <Typography variant="caption" style={{ color: priorityColors[issue.priority] ?? subtext }}>
              {t(`Issues.priorities.${issue.priority}`, { defaultValue: issue.priority })}
            </Typography>
          </View>
          <Typography variant="h2" style={[styles.title, { color: text }]}>
            {issue.title}
          </Typography>
          <Typography variant="caption" style={{ color: subtext, marginBottom: spacing.md }}>
            {t(`Issues.categories.${issue.category}`, { defaultValue: issue.category })} {"\u2022"}{" "}
            {new Date(issue.createdAt).toLocaleDateString()}
          </Typography>
          <Typography style={{ color: text, lineHeight: 22 }}>{issue.description}</Typography>
          {issue.resolvedAt ? (
            <Typography variant="caption" style={{ color: "#22c55e", marginTop: spacing.md }}>
              {t("Issues.resolvedAt", {
                defaultValue: "Resolved: {{date}}",
                date: new Date(issue.resolvedAt).toLocaleDateString(),
              })}
            </Typography>
          ) : null}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: { padding: 0 },
  scroll: { padding: spacing.md },
  card: { padding: spacing.lg, borderRadius: 16, borderWidth: 1 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: 8 },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  title: { marginBottom: spacing.xs },
});
