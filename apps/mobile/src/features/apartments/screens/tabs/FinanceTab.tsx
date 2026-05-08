import React, { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, useColorScheme, View } from "react-native";
import type { LedgerEntry } from "@compound/contracts";
import { Button } from "../../../../components/ui/Button";
import { colors, radii, shadows, spacing, typography } from "../../../../theme";
import type { ApartmentDetail } from "../../../../services/apartments/types";
import { ReceiptSubmitSheet } from "../../components/ReceiptSubmitSheet";

export function FinanceTab({ apartment }: { apartment: ApartmentDetail }) {
  const isDark = useColorScheme() === "dark";
  const account = apartment.finance.account;
  const outstandingEntries = apartment.finance.outstandingEntries;
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showReceiptSheet, setShowReceiptSheet] = useState(false);
  const selectedEntries = useMemo(
    () => outstandingEntries.filter((entry) => selectedIds.includes(entry.id)),
    [outstandingEntries, selectedIds]
  );
  const selectedTotal = selectedEntries.reduce((sum, entry) => sum + Number(entry.amount), 0);

  const toggleEntry = (entryId: number) => {
    setSelectedIds((current) => (current.includes(entryId) ? current.filter((id) => id !== entryId) : [...current, entryId]));
  };

  if (!account) {
    return (
      <View style={styles.list}>
        <View style={[styles.empty, { backgroundColor: colors.surface[isDark ? "dark" : "light"] }]}>
          <Text style={[styles.emptyTitle, { color: colors.text.primary[isDark ? "dark" : "light"] }]}>
            No finance account
          </Text>
          <Text style={[styles.emptyBody, { color: colors.text.secondary[isDark ? "dark" : "light"] }]}>
            Finance details will appear here once admin creates an account for this apartment.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <FlatList
        data={outstandingEntries}
        keyExtractor={(entry) => String(entry.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={[styles.summaryCard, { backgroundColor: colors.surface[isDark ? "dark" : "light"] }]}>
            <Text style={[styles.eyebrow, { color: colors.primary[isDark ? "dark" : "light"] }]}>Finance</Text>
            <Text
              style={[
                styles.balance,
                { color: Number(account.balance) > 0 ? colors.error : colors.success },
              ]}
            >
              {formatMoney(account.balance, account.currency)}
            </Text>
            <Text style={[styles.subtitle, { color: colors.text.secondary[isDark ? "dark" : "light"] }]}>
              Select outstanding charges, then upload an external payment receipt for review.
            </Text>
            <View style={styles.selectionBar}>
              <Text style={[styles.selectionText, { color: colors.text.primary[isDark ? "dark" : "light"] }]}>
                {selectedIds.length} selected · {formatMoney(selectedTotal, account.currency)}
              </Text>
              <Button
                title="Submit receipt"
                onPress={() => setShowReceiptSheet(true)}
                disabled={selectedIds.length === 0}
                style={styles.receiptButton}
              />
            </View>
          </View>
        }
        ListEmptyComponent={<EmptyState />}
        renderItem={({ item }) => (
          <OutstandingRow
            entry={item}
            currency={account.currency}
            isDark={isDark}
            selected={selectedIds.includes(item.id)}
            onPress={() => toggleEntry(item.id)}
          />
        )}
      />

      {showReceiptSheet ? (
        <ReceiptSubmitSheet
          accountId={account.id}
          currency={account.currency}
          selectedEntries={selectedEntries}
          onClose={() => setShowReceiptSheet(false)}
          onSubmitted={() => {
            setShowReceiptSheet(false);
            setSelectedIds([]);
          }}
        />
      ) : null}
    </>
  );
}

function OutstandingRow({
  entry,
  currency,
  isDark,
  selected,
  onPress,
}: {
  entry: LedgerEntry;
  currency: string;
  isDark: boolean;
  selected: boolean;
  onPress: () => void;
}) {
  const surface = colors.surface[isDark ? "dark" : "light"];
  const selectedSurface = colors.primary[isDark ? "dark" : "light"];
  const textColor = selected ? colors.text.inverse : colors.text.primary[isDark ? "dark" : "light"];
  const secondaryColor = selected ? colors.text.inverse : colors.text.secondary[isDark ? "dark" : "light"];

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.outstandingRow,
        {
          backgroundColor: selected ? selectedSurface : surface,
          borderColor: selected ? "transparent" : colors.border[isDark ? "dark" : "light"],
        },
      ]}
    >
      <View style={styles.rowTop}>
        <Text style={[styles.description, { color: textColor }]}>{entry.description ?? formatEntryType(entry.type)}</Text>
        <Text style={[styles.amount, { color: textColor }]}>{formatMoney(entry.amount, currency)}</Text>
      </View>
      <Text style={[styles.meta, { color: secondaryColor }]}>
        {selected ? "Selected" : "Tap to include"} · {formatDate(entry.createdAt)}
      </Text>
    </Pressable>
  );
}

function EmptyState() {
  const isDark = useColorScheme() === "dark";

  return (
    <View style={[styles.empty, { backgroundColor: colors.surface[isDark ? "dark" : "light"] }]}>
      <Text style={[styles.emptyTitle, { color: colors.text.primary[isDark ? "dark" : "light"] }]}>
        No outstanding charges
      </Text>
      <Text style={[styles.emptyBody, { color: colors.text.secondary[isDark ? "dark" : "light"] }]}>
        Charges posted by admin will appear here when they are ready for receipt submission.
      </Text>
    </View>
  );
}

function formatMoney(amount: number | string, currency: string): string {
  return `${Number(amount).toFixed(2)} ${currency}`;
}

function formatEntryType(type: string): string {
  return type.replace(/_/g, " ");
}

function formatDate(value: string | null): string {
  if (!value) {
    return "No date";
  }

  return new Date(value).toLocaleDateString();
}

const styles = StyleSheet.create({
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
  balance: {
    ...typography.display,
    marginTop: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    marginTop: spacing.xs,
  },
  selectionBar: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  selectionText: {
    ...typography.bodyStrong,
  },
  receiptButton: {
    alignSelf: "stretch",
  },
  outstandingRow: {
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.md,
  },
  rowTop: {
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  description: {
    ...typography.bodyStrong,
    flex: 1,
    textTransform: "capitalize",
  },
  amount: {
    ...typography.bodyStrong,
  },
  meta: {
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
