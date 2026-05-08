import React from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, useColorScheme, View } from "react-native";
import { colors, radii, shadows, spacing, typography } from "../../../../theme";
import { useListViolationsQuery } from "../../../../services/apartments/violationsApi";
import type { ApartmentDetail, ApartmentViolation } from "../../../../services/apartments/types";

export function ViolationsTab({ apartment }: { apartment: ApartmentDetail }) {
  const isDark = useColorScheme() === "dark";
  const { data = [], isLoading } = useListViolationsQuery(apartment.id);
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
      ListHeaderComponent={
        <View style={[styles.summaryCard, { backgroundColor: colors.surface[isDark ? "dark" : "light"] }]}>
          <Text style={[styles.eyebrow, { color: colors.primary[isDark ? "dark" : "light"] }]}>Violations</Text>
          <Text style={[styles.total, { color: colors.text.primary[isDark ? "dark" : "light"] }]}>
            {pendingTotal.toFixed(2)}
          </Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary[isDark ? "dark" : "light"] }]}>
            Pending violation balance across {data.length} records.
          </Text>
        </View>
      }
      ListEmptyComponent={<EmptyState />}
      renderItem={({ item }) => <ViolationRow violation={item} isDark={isDark} />}
    />
  );
}

function ViolationRow({ violation, isDark }: { violation: ApartmentViolation; isDark: boolean }) {
  const surface = colors.surface[isDark ? "dark" : "light"];
  const border = colors.border[isDark ? "dark" : "light"];
  const text = colors.text.primary[isDark ? "dark" : "light"];
  const secondary = colors.text.secondary[isDark ? "dark" : "light"];
  const badgeColor = violation.status === "paid" ? colors.success : violation.status === "waived" ? colors.info : colors.warning;

  return (
    <View style={[styles.row, { backgroundColor: surface, borderColor: border }]}>
      <View style={styles.rowTop}>
        <Text style={[styles.ruleName, { color: text }]}>{violation.rule?.name ?? "Violation"}</Text>
        <Text style={[styles.fee, { color: text }]}>{Number(violation.fee).toFixed(2)}</Text>
      </View>
      <View style={styles.rowMeta}>
        <Text style={[styles.badge, { backgroundColor: badgeColor }]}>{violation.status}</Text>
        <Text style={[styles.date, { color: secondary }]}>{formatDate(violation.createdAt)}</Text>
      </View>
      {violation.notes ? <Text style={[styles.notes, { color: secondary }]}>{violation.notes}</Text> : null}
    </View>
  );
}

function EmptyState() {
  const isDark = useColorScheme() === "dark";

  return (
    <View style={[styles.empty, { backgroundColor: colors.surface[isDark ? "dark" : "light"] }]}>
      <Text style={[styles.emptyTitle, { color: colors.text.primary[isDark ? "dark" : "light"] }]}>
        No violations
      </Text>
      <Text style={[styles.emptyBody, { color: colors.text.secondary[isDark ? "dark" : "light"] }]}>
        This unit has no violation records yet.
      </Text>
    </View>
  );
}

function formatDate(value: string | null): string {
  if (!value) {
    return "No date";
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
