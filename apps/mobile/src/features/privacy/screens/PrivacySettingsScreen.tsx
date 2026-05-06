import React from "react";
import { ScrollView, StyleSheet, View, useColorScheme } from "react-native";
import { useTranslation } from "react-i18next";
import type { UserPolicyConsent } from "@compound/contracts";
import { ScreenContainer } from "../../../components/layout/ScreenContainer";
import { Typography } from "../../../components/ui/Typography";
import { useGetConsentsQuery } from "../../../services/privacy";
import { colors, layout, radii, shadows, spacing } from "../../../theme";
import { Icon } from "../../../components/ui/Icon";

export const PrivacySettingsScreen = () => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === "dark";
  const { data: consents = [], isLoading } = useGetConsentsQuery();

  const surface = isDark ? colors.surface.dark : colors.surface.light;
  const border = isDark ? colors.border.dark : colors.border.light;
  const text = isDark ? colors.text.primary.dark : colors.text.primary.light;

  const activeConsents = consents.filter((consent: UserPolicyConsent) => !consent.revokedAt);

  return (
    <ScreenContainer withKeyboard={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Typography variant="h2" style={[styles.heading, { color: text }]}>
          {t("Privacy.consentsHeading", { defaultValue: "Your consents" })}
        </Typography>

        {isLoading ? (
          <Typography variant="caption">{t("Common.loading")}</Typography>
        ) : activeConsents.length === 0 ? (
          <Typography variant="caption">
            {t("Privacy.noConsents", { defaultValue: "No active consents." })}
          </Typography>
        ) : (
          activeConsents.map((consent: UserPolicyConsent) => (
            <View key={consent.id} style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
              <View style={styles.row}>
                <View style={styles.titleRow}>
                  <View style={styles.iconBadge}>
                    <Icon name="privacy" color={colors.primary.light} size={20} />
                  </View>
                  <Typography variant="h3" style={[styles.title, { color: text }]}>
                    {t(`Privacy.policies.${consent.policyType}`, {
                      defaultValue: consent.policyType.replace(/_/g, " "),
                    })}
                  </Typography>
                </View>
                <View style={styles.activeBadge}>
                  <Typography variant="caption" style={styles.activeBadgeText}>
                    {t("Common.active", { defaultValue: "Active" })}
                  </Typography>
                </View>
              </View>
              <Typography variant="caption" style={styles.mutedText}>
                {t("Privacy.version", { defaultValue: "Version {{v}}", v: consent.policyVersion })} {"\u2022"}{" "}
                {new Date(consent.acceptedAt).toLocaleDateString()}
              </Typography>
            </View>
          ))
        )}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scroll: { padding: layout.screenGutter, paddingBottom: layout.screenBottom },
  heading: { marginBottom: spacing.md },
  card: { padding: layout.cardPadding, borderRadius: radii.xl, borderWidth: 1, marginBottom: layout.listGap, ...shadows.sm },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xs, gap: spacing.sm },
  titleRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  iconBadge: { width: 40, height: 40, borderRadius: radii.md, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceMuted.light },
  title: { flex: 1 },
  activeBadge: { backgroundColor: colors.success, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radii.pill },
  activeBadgeText: { color: colors.text.inverse, fontSize: 11, fontWeight: "600" },
  mutedText: { color: colors.text.secondary.light },
});
