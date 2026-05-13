import React from "react";
import { RefreshControl, ScrollView, StyleSheet, View, useColorScheme } from "react-native";
import { useTranslation } from "react-i18next";
import { ScreenContainer } from "../../../components/layout/ScreenContainer";
import { Typography } from "../../../components/ui/Typography";
import { useGetVerificationRequestsQuery } from "../../../services/property";
import { colors, layout, radii, shadows, spacing } from "../../../theme";
import { Icon, type AppIconName } from "../../../components/ui/Icon";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { isRtlLanguage, rowDirectionStyle, textDirectionStyle } from "../../../i18n/direction";

const statusTone: Record<string, { background: string; text: string; icon: AppIconName }> = {
  pending_review: { background: colors.palette.amber[50], text: colors.palette.amber[600], icon: "id" },
  more_info_requested: { background: colors.palette.amber[50], text: colors.palette.amber[600], icon: "alert" },
  approved: { background: colors.palette.emerald[50], text: colors.palette.emerald[600], icon: "check" },
  rejected: { background: colors.palette.red[50], text: colors.palette.red[600], icon: "x" },
};

export const VerificationStatusScreen = () => {
  const { t, i18n } = useTranslation();
  const isDark = useColorScheme() === "dark";
  const isRtl = isRtlLanguage(i18n.language);
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
            <Typography variant="caption" style={textDirectionStyle(isRtl)}>
              {isLoading
                ? t("Common.loading")
                : t("Verification.noRequest")}
            </Typography>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
            <View style={[styles.statusRow, rowDirectionStyle(isRtl)]}>
              <View style={styles.iconBadge}>
                <Icon name={tone.icon} color={tone.text} size={22} />
              </View>
              <StatusBadge
                label={t(`Common.statuses.${latest.status}`)}
                backgroundColor={tone.background}
                textColor={tone.text}
              />
            </View>

            <Typography variant="h2" style={[styles.heading, { color: text }, textDirectionStyle(isRtl)]}>
              {t("Verification.statusHeading")}
            </Typography>

            <View style={[styles.row, rowDirectionStyle(isRtl)]}>
              <Typography variant="caption" style={[styles.fieldLabel, textDirectionStyle(isRtl)]}>
                {t("Verification.role")}
              </Typography>
              <Typography variant="caption" style={[{ color: text }, textDirectionStyle(isRtl)]}>
                {t(`Common.roles.${latest.requestedRole}`)}
              </Typography>
            </View>

            {latest.relationType ? (
              <View style={[styles.row, rowDirectionStyle(isRtl)]}>
                <Typography variant="caption" style={[styles.fieldLabel, textDirectionStyle(isRtl)]}>
                  {t("Verification.relation")}
                </Typography>
                <Typography variant="caption" style={[{ color: text }, textDirectionStyle(isRtl)]}>
                  {t(`Common.relations.${latest.relationType}`)}
                </Typography>
              </View>
            ) : null}

            {latest.submittedAt ? (
              <View style={[styles.row, rowDirectionStyle(isRtl)]}>
                <Typography variant="caption" style={[styles.fieldLabel, textDirectionStyle(isRtl)]}>
                  {t("Verification.submitted")}
                </Typography>
                <Typography variant="caption" style={[{ color: text }, textDirectionStyle(isRtl)]}>
                  {new Date(latest.submittedAt).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US')}
                </Typography>
              </View>
            ) : null}

            {latest.decisionNote ? (
              <View style={styles.noteBox}>
                <Typography variant="caption" style={[styles.fieldLabel, textDirectionStyle(isRtl)]}>
                  {t("Verification.adminNote")}
                </Typography>
                <Typography variant="caption" style={[{ color: text }, textDirectionStyle(isRtl)]}>
                  {latest.decisionNote}
                </Typography>
              </View>
            ) : null}

            {latest.moreInfoNote ? (
              <View style={[styles.noteBox, { borderColor: colors.warning }]}>
                <Typography variant="caption" style={[styles.fieldLabel, { color: colors.warning }, textDirectionStyle(isRtl)]}>
                  {t("Verification.moreInfoNote")}
                </Typography>
                <Typography variant="caption" style={[{ color: text }, textDirectionStyle(isRtl)]}>
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
