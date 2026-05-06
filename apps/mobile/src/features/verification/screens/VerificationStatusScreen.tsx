import React from "react";
import { RefreshControl, ScrollView, StyleSheet, View, useColorScheme } from "react-native";
import { useTranslation } from "react-i18next";
import { ScreenContainer } from "../../../components/layout/ScreenContainer";
import { Typography } from "../../../components/ui/Typography";
import { useGetVerificationRequestsQuery } from "../../../services/property";
import { colors, layout, radii, shadows, spacing } from "../../../theme";
import { Icon, type AppIconName } from "../../../components/ui/Icon";
import { StatusBadge } from "../../../components/ui/StatusBadge";

const statusTone: Record<string, { background: string; text: string; icon: AppIconName }> = {
  pending_review: { background: colors.palette.amber[50], text: colors.palette.amber[600], icon: "id" },
  more_info_requested: { background: colors.palette.amber[50], text: colors.palette.amber[600], icon: "alert" },
  approved: { background: colors.palette.emerald[50], text: colors.palette.emerald[600], icon: "check" },
  rejected: { background: colors.palette.red[50], text: colors.palette.red[600], icon: "x" },
};

export const VerificationStatusScreen = () => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === "dark";
  const { data: requests = [], isLoading, refetch } = useGetVerificationRequestsQuery();

  const surface = isDark ? colors.surface.dark : colors.surface.light;
  const border = isDark ? colors.border.dark : colors.border.light;
  const text = isDark ? colors.text.primary.dark : colors.text.primary.light;

  const latest = requests[0];
  const tone = latest ? (statusTone[latest.status] ?? statusTone.pending_review) : statusTone.pending_review;

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
              <View style={styles.iconBadge}>
                <Icon name={tone.icon} color={tone.text} size={22} />
              </View>
              <StatusBadge
                label={t(`Common.statuses.${latest.status}`, { defaultValue: latest.status })}
                backgroundColor={tone.background}
                textColor={tone.text}
              />
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
              <View style={[styles.noteBox, { borderColor: colors.warning }]}>
                <Typography variant="caption" style={[styles.fieldLabel, { color: colors.warning }]}>
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
  scroll: { padding: layout.screenGutter, paddingBottom: layout.screenBottom },
  center: { padding: spacing.xl, alignItems: "center" },
  card: { padding: layout.cardPadding, borderRadius: radii.xl, borderWidth: 1, ...shadows.sm },
  statusRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  iconBadge: { width: 44, height: 44, borderRadius: radii.md, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceMuted.light },
  heading: { marginBottom: spacing.md },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.light,
  },
  fieldLabel: { color: colors.text.secondary.light },
  noteBox: { marginTop: spacing.md, padding: layout.cardPadding, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border.light, gap: spacing.xs },
});
