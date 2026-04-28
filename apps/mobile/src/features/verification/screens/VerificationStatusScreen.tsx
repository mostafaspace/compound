import React from "react";
import { RefreshControl, ScrollView, StyleSheet, View, useColorScheme } from "react-native";
import { useTranslation } from "react-i18next";
import { ScreenContainer } from "../../../components/layout/ScreenContainer";
import { Typography } from "../../../components/ui/Typography";
import { useGetVerificationRequestsQuery } from "../../../services/property";
import { colors, spacing } from "../../../theme";

const statusColors: Record<string, string> = {
  pending_review: "#f97316",
  more_info_requested: "#eab308",
  approved: "#22c55e",
  rejected: "#ef4444",
};

const statusIcons: Record<string, string> = {
  pending_review: "\u23f3",
  more_info_requested: "\ud83d\udccb",
  approved: "\u2705",
  rejected: "\u274c",
};

export const VerificationStatusScreen = () => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === "dark";
  const { data: requests = [], isLoading, refetch } = useGetVerificationRequestsQuery();

  const surface = isDark ? colors.surface.dark : colors.surface.light;
  const border = isDark ? colors.border.dark : colors.border.light;
  const text = isDark ? colors.text.primary.dark : colors.text.primary.light;

  const latest = requests[0];

  return (
    <ScreenContainer withKeyboard={false} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      >
        {!latest ? (
          <View style={styles.center}>
            <Typography variant="caption">
              {isLoading
                ? t("Common.loading")
                : t("Verification.noRequest", { defaultValue: "No verification request found." })}
            </Typography>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
            <View style={styles.statusRow}>
              <Typography style={styles.icon}>{statusIcons[latest.status] ?? "\u2022"}</Typography>
              <View style={[styles.badge, { backgroundColor: statusColors[latest.status] ?? "#6b7280" }]}>
                <Typography variant="caption" style={styles.badgeText}>
                  {t(`Common.statuses.${latest.status}`, { defaultValue: latest.status })}
                </Typography>
              </View>
            </View>

            <Typography variant="h2" style={[styles.heading, { color: text }]}>
              {t("Verification.statusHeading", { defaultValue: "Verification Status" })}
            </Typography>

            <View style={styles.row}>
              <Typography variant="caption" style={styles.fieldLabel}>
                {t("Verification.role", { defaultValue: "Requested role" })}
              </Typography>
              <Typography variant="caption" style={{ color: text }}>
                {t(`Common.roles.${latest.requestedRole}`, { defaultValue: latest.requestedRole })}
              </Typography>
            </View>

            {latest.relationType ? (
              <View style={styles.row}>
                <Typography variant="caption" style={styles.fieldLabel}>
                  {t("Verification.relation", { defaultValue: "Relation" })}
                </Typography>
                <Typography variant="caption" style={{ color: text }}>
                  {t(`Common.relations.${latest.relationType}`, { defaultValue: latest.relationType })}
                </Typography>
              </View>
            ) : null}

            {latest.submittedAt ? (
              <View style={styles.row}>
                <Typography variant="caption" style={styles.fieldLabel}>
                  {t("Verification.submitted", { defaultValue: "Submitted" })}
                </Typography>
                <Typography variant="caption" style={{ color: text }}>
                  {new Date(latest.submittedAt).toLocaleDateString()}
                </Typography>
              </View>
            ) : null}

            {latest.decisionNote ? (
              <View style={styles.noteBox}>
                <Typography variant="caption" style={styles.fieldLabel}>
                  {t("Verification.adminNote", { defaultValue: "Admin note" })}
                </Typography>
                <Typography variant="caption" style={{ color: text }}>
                  {latest.decisionNote}
                </Typography>
              </View>
            ) : null}

            {latest.moreInfoNote ? (
              <View style={[styles.noteBox, { borderColor: "#eab308" }]}>
                <Typography variant="caption" style={[styles.fieldLabel, { color: "#eab308" }]}>
                  {t("Verification.moreInfoNote", { defaultValue: "Additional information requested" })}
                </Typography>
                <Typography variant="caption" style={{ color: text }}>
                  {latest.moreInfoNote}
                </Typography>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: { padding: 0 },
  scroll: { padding: spacing.md },
  center: { padding: spacing.xl, alignItems: "center" },
  card: { padding: spacing.lg, borderRadius: 16, borderWidth: 1 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  icon: { fontSize: 28 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: 8 },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  heading: { marginBottom: spacing.md },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  fieldLabel: { color: "#6b7280" },
  noteBox: { marginTop: spacing.md, padding: spacing.md, borderRadius: 8, borderWidth: 1, borderColor: "#e5e7eb", gap: spacing.xs },
});
