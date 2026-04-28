import React, { useEffect } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View, useColorScheme } from "react-native";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import type { PolicyType } from "@compound/contracts";
import { ScreenContainer } from "../../../components/layout/ScreenContainer";
import { Button } from "../../../components/ui/Button";
import { Typography } from "../../../components/ui/Typography";
import { useAcceptConsentMutation, useGetConsentsQuery } from "../../../services/privacy";
import { setConsentVerified } from "../../../store/authSlice";
import { colors, spacing } from "../../../theme";

const REQUIRED_POLICIES: PolicyType[] = ["privacy_policy", "terms_of_service"];
const CURRENT_VERSION = "1.0";

export const PrivacyConsentScreen = () => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === "dark";
  const dispatch = useDispatch();
  const { data: consents = [], isLoading } = useGetConsentsQuery();
  const [acceptConsent, { isLoading: isAccepting }] = useAcceptConsentMutation();

  const activeConsents = consents.filter((consent) => !consent.revokedAt);
  const missingPolicies = REQUIRED_POLICIES.filter(
    (policy) =>
      !activeConsents.some(
        (consent) => consent.policyType === policy && consent.policyVersion === CURRENT_VERSION
      )
  );

  useEffect(() => {
    if (!isLoading && missingPolicies.length === 0) {
      dispatch(setConsentVerified(true));
    }
  }, [dispatch, isLoading, missingPolicies.length]);

  const handleAcceptAll = async () => {
    try {
      await Promise.all(
        missingPolicies.map((policy) =>
          acceptConsent({ policyType: policy, policyVersion: CURRENT_VERSION }).unwrap()
        )
      );
      dispatch(setConsentVerified(true));
    } catch {
      dispatch(setConsentVerified(false));
    }
  };

  const backgroundColor = isDark ? colors.background.dark : colors.background.light;
  const text = isDark ? colors.text.primary.dark : colors.text.primary.light;
  const surface = isDark ? colors.surface.dark : colors.surface.light;
  const border = isDark ? colors.border.dark : colors.border.light;

  if (isLoading || missingPolicies.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor }]}>
        <ActivityIndicator size="large" color={isDark ? colors.cta.dark : colors.cta.light} />
      </View>
    );
  }

  return (
    <ScreenContainer withKeyboard={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Typography style={styles.logo}>CP</Typography>
        <Typography variant="h1" style={[styles.heading, { color: text }]}>
          {t("Privacy.consentTitle", { defaultValue: "Before you continue" })}
        </Typography>
        <Typography style={[styles.body, { color: text }]}>
          {t("Privacy.consentBody", {
            defaultValue: "Please review and accept the following to use the platform:",
          })}
        </Typography>

        {missingPolicies.map((policy) => (
          <View key={policy} style={[styles.policyCard, { backgroundColor: surface, borderColor: border }]}>
            <Typography variant="h3" style={{ color: text }}>
              {t(`Privacy.policies.${policy}`, { defaultValue: policy.replace(/_/g, " ") })}
            </Typography>
            <Typography variant="caption" style={{ color: "#6b7280", marginTop: spacing.xs }}>
              {t(`Privacy.policiesDesc.${policy}`, { defaultValue: `Version ${CURRENT_VERSION}` })}
            </Typography>
          </View>
        ))}

        <Button
          title={isAccepting ? t("Common.loading") : t("Privacy.acceptAll", { defaultValue: "Accept & Continue" })}
          onPress={handleAcceptAll}
          loading={isAccepting}
          style={styles.acceptBtn}
        />
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { padding: spacing.xl, paddingTop: 60, alignItems: "center" },
  logo: { fontSize: 28, fontWeight: "800", marginBottom: spacing.lg },
  heading: { textAlign: "center", marginBottom: spacing.md },
  body: { textAlign: "center", marginBottom: spacing.xl, lineHeight: 22 },
  policyCard: { width: "100%", padding: spacing.lg, borderRadius: 12, borderWidth: 1, marginBottom: spacing.md },
  acceptBtn: { marginTop: spacing.xl, width: "100%", borderRadius: 12 },
});
