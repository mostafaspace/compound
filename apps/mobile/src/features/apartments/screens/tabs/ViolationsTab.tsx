import React from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, useColorScheme, View } from "react-native";
import { useTranslation } from "react-i18next";
import { colors, radii, shadows, spacing, typography } from "../../../../theme";
import { useListViolationsQuery } from "../../../../services/apartments/violationsApi";
import type { ApartmentDetail, ApartmentViolation } from "../../../../services/apartments/types";
import { isRtlLanguage, rowDirectionStyle, textDirectionStyle } from "../../../../i18n/direction";
import type { ApartmentTabRefreshProps } from "../ApartmentDetailScreen";

export function ViolationsTab({ apartment, onRefresh, refreshing, onContentScroll }: { apartment: ApartmentDetail } & ApartmentTabRefreshProps) {
  const { t, i18n } = useTranslation();
  const isDark = useColorScheme() === "dark";
  const isRtl = isRtlLanguage(i18n.language);
  const { data = [], isLoading, isFetching, refetch } = useListViolationsQuery(apartment.id);
  const handleRefresh = () => {
    void refetch();
    void onRefresh?.();
  };
  const pendingTotal = data
    .filter((violation) => violation.status === "pending")
    .reduce((sum, violation) => sum + Number(violation.fee), 0);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary[isDark ? "dark" : "light"]} />
      </View>
    );
  }

  return (
    <FlatList
      data={data}
      keyExtractor={(violation) => String(violation.id)}
      contentContainerStyle={styles.list}
      refreshing={Boolean(refreshing || isFetching)}
      onRefresh={handleRefresh}
      onScroll={onContentScroll}
      scrollEventThrottle={16}
      ListHeaderComponent={
        <View style={[styles.summaryCard, { backgroundColor: colors.surface[isDark ? "dark" : "light"] }, textDirectionStyle(isRtl)]}>
          <Text style={[styles.eyebrow, { color: colors.primary[isDark ? "dark" : "light"] }, textDirectionStyle(isRtl)]}>{t("Violations.label")}</Text>
          <Text style={[styles.total, { color: colors.text.primary[isDark ? "dark" : "light"] }, textDirectionStyle(isRtl)]}>
            {pendingTotal.toFixed(2)}
          </Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary[isDark ? "dark" : "light"] }, textDirectionStyle(isRtl)]}>
            {t("Violations.pendingBalance", { count: data.length })}
          </Text>
        </View>
      }
      ListEmptyComponent={<EmptyState t={t} isRtl={isRtl} />}
      renderItem={({ item }) => <ViolationRow violation={item} isDark={isDark} t={t} isRtl={isRtl} />}
    />
  );
}

function ViolationRow({ violation, isDark, t, isRtl }: { violation: ApartmentViolation; isDark: boolean; t: any; isRtl: boolean }) {
  const surface = colors.surface[isDark ? "dark" : "light"];
  const border = colors.border[isDark ? "dark" : "light"];
  const text = colors.text.primary[isDark ? "dark" : "light"];
  const secondary = colors.text.secondary[isDark ? "dark" : "light"];
  const badgeColor = violation.status === "paid" ? colors.success : violation.status === "waived" ? colors.info : colors.warning;

  return (
    <View style={[styles.row, { backgroundColor: surface, borderColor: border }, textDirectionStyle(isRtl)]}>
      <View style={[styles.rowTop, rowDirectionStyle(isRtl)]}>
        <Text style={[styles.ruleName, { color: text }, textDirectionStyle(isRtl)]}>{violation.rule?.name ?? t("Violations.violation")}</Text>
        <Text style={[styles.fee, { color: text }, textDirectionStyle(isRtl)]}>{Number(violation.fee).toFixed(2)}</Text>
      </View>
      <View style={[styles.rowMeta, rowDirectionStyle(isRtl)]}>
        <Text style={[styles.badge, { backgroundColor: badgeColor }, textDirectionStyle(isRtl)]}>{t(`Common.statuses.${violation.status}`, { defaultValue: violation.status })}</Text>
        <Text style={[styles.date, { color: secondary }, textDirectionStyle(isRtl)]}>{formatDate(violation.createdAt, t)}</Text>
      </View>
      {violation.notes ? <Text style={[styles.notes, { color: secondary }, textDirectionStyle(isRtl)]}>{violation.notes}</Text> : null}
    </View>
  );
}

function EmptyState({ t, isRtl }: { t: any, isRtl: boolean }) {
  const isDark = useColorScheme() === "dark";

  return (
    <View style={[styles.empty, { backgroundColor: colors.surface[isDark ? "dark" : "light"] }, textDirectionStyle(isRtl)]}>
      <Text style={[styles.emptyTitle, { color: colors.text.primary[isDark ? "dark" : "light"] }, textDirectionStyle(isRtl)]}>
        {t("Violations.noViolations")}
      </Text>
      <Text style={[styles.emptyBody, { color: colors.text.secondary[isDark ? "dark" : "light"] }, textDirectionStyle(isRtl)]}>
        {t("Violations.noViolationsHint")}
      </Text>
    </View>
  );
}

function formatDate(value: string | null, t: any): string {
  if (!value) {
    return t("Violations.noDate");
  }

  return new Date(value).toLocaleDateString();
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  list: {
    gap: spacing.md,
    padding: spacing.md,
  },
  summaryCard: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    ...shadows.md,
  },
  eyebrow: {
    ...typography.label,
  },
  total: {
    ...typography.display,
    marginTop: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    marginTop: spacing.xs,
  },
  row: {
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.md,
  },
  rowTop: {
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  ruleName: {
    ...typography.bodyStrong,
    flex: 1,
  },
  fee: {
    ...typography.bodyStrong,
  },
  rowMeta: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  badge: {
    ...typography.caption,
    borderRadius: radii.pill,
    color: colors.text.inverse,
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    textTransform: "capitalize",
  },
  date: {
    ...typography.caption,
  },
  notes: {
    ...typography.body,
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
