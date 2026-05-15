import React, { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, useColorScheme, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { LedgerEntry, PaymentSubmission } from "@compound/contracts";
import { Button } from "../../../../components/ui/Button";
import { Typography } from "../../../../components/ui/Typography";
import { Icon } from "../../../../components/ui/Icon";
import { colors, radii, shadows, spacing, typography } from "../../../../theme";
import type { ApartmentDetail } from "../../../../services/apartments/types";
import { ReceiptSubmitSheet } from "../../components/ReceiptSubmitSheet";
import { isRtlLanguage, rowDirectionStyle, textDirectionStyle } from "../../../../i18n/direction";
import type { ApartmentTabRefreshProps } from "../ApartmentDetailScreen";

export function FinanceTab({ apartment, onRefresh, refreshing, onContentScroll }: { apartment: ApartmentDetail } & ApartmentTabRefreshProps) {
  const { t, i18n } = useTranslation();
  const isDark = useColorScheme() === "dark";
  const isRtl = isRtlLanguage(i18n.language);
  const account = apartment.finance.account;
  const outstandingEntries = apartment.finance.outstandingEntries;
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showReceiptSheet, setShowReceiptSheet] = useState(false);

  const [activeTab, setActiveTab] = useState<"outstanding" | "history">("outstanding");
  const selectedEntries = useMemo(
    () => outstandingEntries.filter((entry) => selectedIds.includes(entry.id)),
    [outstandingEntries, selectedIds]
  );
  const selectedTotal = selectedEntries.reduce((sum, entry) => sum + Number(entry.amount), 0);

  if (!account) {
    return (
      <FlatList
        data={[] as string[]}
        keyExtractor={(item) => item}
        renderItem={() => null}
        contentContainerStyle={styles.list}
        refreshing={Boolean(refreshing)}
        onRefresh={onRefresh}
        onScroll={onContentScroll}
        scrollEventThrottle={16}
        ListEmptyComponent={
          <View style={[styles.empty, { backgroundColor: colors.surface[isDark ? "dark" : "light"] }, textDirectionStyle(isRtl)]}>
            <Text style={[styles.emptyTitle, { color: colors.text.primary[isDark ? "dark" : "light"] }, textDirectionStyle(isRtl)]}>
              {t("Finance.noAccount")}
            </Text>
            <Text style={[styles.emptyBody, { color: colors.text.secondary[isDark ? "dark" : "light"] }, textDirectionStyle(isRtl)]}>
              {t("Finance.noAccountHint")}
            </Text>
          </View>
        }
      />
    );
  }

  const submissions = account.paymentSubmissions ?? [];

  const toggleEntry = (entryId: number) => {
    setSelectedIds((current) => (current.includes(entryId) ? current.filter((id) => id !== entryId) : [...current, entryId]));
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === outstandingEntries.length) {
      setSelectedIds([]);
    } else {
      const nextIds: number[] = [];
      for (let index = 0; index < outstandingEntries.length; index += 1) {
        nextIds.push(outstandingEntries[index].id);
      }
      setSelectedIds(nextIds);
    }
  };

  const isDue = Number(account.pendingBalance ?? account.balance) > 0;
  const statusColor = isDue ? colors.error : "#CA8A04"; // Gold for credit

  return (
    <View style={styles.container}>
      <FlatList
        data={(activeTab === "outstanding" ? outstandingEntries : submissions) as any[]}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshing={Boolean(refreshing)}
        onRefresh={onRefresh}
        onScroll={onContentScroll}
        scrollEventThrottle={16}
        ListHeaderComponent={
          <>
            <View
              style={[
                styles.summaryCard,
                {
                  backgroundColor: colors.surface[isDark ? "dark" : "light"],
                },
              ]}
            >
              <View style={[rowDirectionStyle(isRtl), { alignItems: "center" }]}>
                <Typography variant="label" color="secondary" style={{ flex: 1 }}>
                  {t("Finance.label")}
                </Typography>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: statusColor + "15" },
                    rowDirectionStyle(isRtl),
                  ]}
                >
                  <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                  <Typography variant="label" style={{ color: statusColor, fontSize: 10 }}>
                    {isDue ? t("Finance.due") : t("Finance.credit")}
                  </Typography>
                </View>
              </View>

              <Text
                style={[
                  styles.balance,
                  { color: colors.text.primary[isDark ? "dark" : "light"] },
                  textDirectionStyle(isRtl),
                ]}
              >
                {formatMoney(
                  Math.abs(Number(account.pendingBalance ?? account.balance)),
                  account.currency,
                  isRtl
                )}
              </Text>

              <View style={[rowDirectionStyle(isRtl), { alignItems: "center", marginTop: spacing.md }]}>
                <Typography variant="caption" color="secondary" style={{ flex: 1 }}>
                  {t("Finance.instruction")}
                </Typography>
                {activeTab === "outstanding" && outstandingEntries.length > 0 && (
                  <Pressable onPress={toggleSelectAll} style={styles.selectAllBtn}>
                    <Typography variant="label" style={{ color: colors.primary[isDark ? "dark" : "light"] }}>
                      {selectedIds.length === outstandingEntries.length
                        ? t("Finance.deselectAll")
                        : t("Finance.selectAll")}
                    </Typography>
                  </Pressable>
                )}
              </View>
            </View>

            <View style={[styles.tabs, rowDirectionStyle(isRtl)]}>
              <Pressable
                onPress={() => setActiveTab("outstanding")}
                style={[
                  styles.tab,
                  activeTab === "outstanding" && {
                    borderBottomColor: colors.primary[isDark ? "dark" : "light"],
                    borderBottomWidth: 2,
                  },
                ]}
              >
                <Typography
                  variant="label"
                  style={{
                    color: activeTab === "outstanding" ? colors.primary[isDark ? "dark" : "light"] : colors.text.secondary[isDark ? "dark" : "light"],
                  }}
                >
                  {t("Finance.outstanding")}
                </Typography>
              </Pressable>
              <Pressable
                onPress={() => setActiveTab("history")}
                style={[
                  styles.tab,
                  activeTab === "history" && {
                    borderBottomColor: colors.primary[isDark ? "dark" : "light"],
                    borderBottomWidth: 2,
                  },
                ]}
              >
                <Typography
                  variant="label"
                  style={{
                    color: activeTab === "history" ? colors.primary[isDark ? "dark" : "light"] : colors.text.secondary[isDark ? "dark" : "light"],
                  }}
                >
                  {t("Finance.recentPayments")}
                </Typography>
              </Pressable>
            </View>
          </>
        }
        ListEmptyComponent={<EmptyState t={t} isRtl={isRtl} type={activeTab} />}
        renderItem={({ item }) =>
          activeTab === "outstanding" ? (
            <OutstandingRow
              entry={item as any}
              currency={account.currency}
              isDark={isDark}
              isRtl={isRtl}
              selected={selectedIds.includes(item.id)}
              onPress={() => toggleEntry(item.id)}
              t={t}
            />
          ) : (
            <PaymentSubmissionRow
              submission={item as any}
              currency={account.currency}
              isDark={isDark}
              isRtl={isRtl}
              t={t}
            />
          )
        }
      />

      {selectedIds.length > 0 && (
        <View
          style={[
            styles.floatingFooter,
            {
              backgroundColor: isDark ? "rgba(15, 23, 42, 0.9)" : "rgba(255, 255, 255, 0.9)",
              borderTopColor: colors.border[isDark ? "dark" : "light"],
            },
          ]}
        >
          <View style={[rowDirectionStyle(isRtl), { alignItems: "center" }]}>
            <View style={{ flex: 1 }}>
              <Typography variant="caption" color="secondary">
                {t("Finance.selected")}
              </Typography>
              <Typography variant="h3" style={{ color: colors.text.primary[isDark ? "dark" : "light"] }}>
                {selectedIds.length} · {formatMoney(selectedTotal, account.currency, isRtl)}
              </Typography>
            </View>
            <Button
              title={t("Finance.submitReceipt")}
              onPress={() => setShowReceiptSheet(true)}
              style={styles.receiptButton}
            />
          </View>
        </View>
      )}

      {showReceiptSheet ? (
        <ReceiptSubmitSheet
          accountId={account.id}
          unitId={apartment.unit.id}
          currency={account.currency}
          selectedEntries={selectedEntries}
          onClose={() => setShowReceiptSheet(false)}
          onSubmitted={() => {
            setShowReceiptSheet(false);
            setSelectedIds([]);
            onRefresh?.();
          }}
        />
      ) : null}
    </View>
  );
}

function OutstandingRow({
  entry,
  currency,
  isDark,
  isRtl,
  selected,
  onPress,
  t,
}: {
  entry: LedgerEntry;
  currency: string;
  isDark: boolean;
  isRtl: boolean;
  selected: boolean;
  onPress: () => void;
  t: any;
}) {
  const surface = colors.surface[isDark ? "dark" : "light"];
  const border = colors.border[isDark ? "dark" : "light"];
  const primary = colors.primary[isDark ? "dark" : "light"];

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.outstandingRow,
        {
          backgroundColor: selected ? primary + "15" : surface,
          borderColor: selected ? primary : border,
          borderWidth: 2,
        },
      ]}
    >
      <View style={[styles.rowTop, rowDirectionStyle(isRtl)]}>
        <Text
          style={[
            styles.description,
            { color: colors.text.primary[isDark ? "dark" : "light"] },
            textDirectionStyle(isRtl),
          ]}
        >
          {entry.description ?? formatEntryType(entry.type, t)}
        </Text>
        <Text
          style={[
            styles.amount,
            { color: colors.text.primary[isDark ? "dark" : "light"] },
            textDirectionStyle(isRtl),
          ]}
        >
          {formatMoney(entry.amount, currency, isRtl)}
        </Text>
      </View>
      <View style={[rowDirectionStyle(isRtl), { alignItems: "center", marginTop: spacing.sm }]}>
        <Typography variant="caption" color="secondary" style={{ flex: 1 }}>
          {selected ? t("Finance.selected") : t("Finance.tapToInclude")} · {formatDate(entry.createdAt, t)}
        </Typography>
        {selected && <Icon name="check" size={16} color={primary} />}
      </View>
    </Pressable>
  );
}

function PaymentSubmissionRow({
  submission,
  currency,
  isDark,
  isRtl,
  t,
}: {
  submission: PaymentSubmission;
  currency: string;
  isDark: boolean;
  isRtl: boolean;
  t: any;
}) {
  const surface = colors.surface[isDark ? "dark" : "light"];
  const border = colors.border[isDark ? "dark" : "light"];

  const statusColors: Record<string, string> = {
    approved: colors.success,
    under_review: colors.warning,
    submitted: colors.info,
    rejected: colors.error,
  };

  const statusColor = statusColors[submission.status] || colors.text.secondary[isDark ? "dark" : "light"];

  return (
    <View
      style={[
        styles.outstandingRow,
        {
          backgroundColor: surface,
          borderColor: border,
          borderWidth: 1,
        },
      ]}
    >
      <View style={[styles.rowTop, rowDirectionStyle(isRtl)]}>
        <View style={{ flex: 1 }}>
          <Typography variant="bodyStrong">
            {formatMoney(submission.amount, currency, isRtl)}
          </Typography>
          <Typography variant="caption" color="secondary" style={{ marginTop: 2 }}>
            {submission.method.replace(/_/g, " ")} · {formatDate(submission.createdAt, t)}
          </Typography>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusColor + "15", height: 24 },
            rowDirectionStyle(isRtl),
          ]}
        >
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Typography variant="label" style={{ color: statusColor, fontSize: 10, textTransform: "capitalize" }}>
            {submission.status.replace(/_/g, " ")}
          </Typography>
        </View>
      </View>
      {submission.rejectionReason && (
        <Typography variant="caption" style={{ color: colors.error, marginTop: spacing.xs }}>
          {submission.rejectionReason}
        </Typography>
      )}
      {submission.correctionNote && (
        <Typography variant="caption" style={{ color: colors.warning, marginTop: spacing.xs }}>
          {t("Finance.correctionRequested")}: {submission.correctionNote}
        </Typography>
      )}
    </View>
  );
}

function EmptyState({ t, isRtl, type = "outstanding" }: { t: any; isRtl: boolean; type?: "outstanding" | "history" }) {
  const isDark = useColorScheme() === "dark";

  return (
    <View style={[styles.empty, { backgroundColor: colors.surface[isDark ? "dark" : "light"] }, textDirectionStyle(isRtl)]}>
      <Text style={[styles.emptyTitle, { color: colors.text.primary[isDark ? "dark" : "light"] }, textDirectionStyle(isRtl)]}>
        {type === "outstanding" ? t("Finance.noCharges") : t("Finance.noTransactions")}
      </Text>
      <Text style={[styles.emptyBody, { color: colors.text.secondary[isDark ? "dark" : "light"] }, textDirectionStyle(isRtl)]}>
        {type === "outstanding" ? t("Finance.noChargesHint") : t("Finance.noTransactionsHint")}
      </Text>
    </View>
  );
}

function formatMoney(amount: number | string, currency: string, isRtl: boolean): string {
  const formattedAmount = Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return isRtl ? `${currency} ${formattedAmount}` : `${formattedAmount} ${currency}`;
}

function formatEntryType(type: string, t: any): string {
  return t(`Finance.entryTypes.${type}`, { defaultValue: type.replace(/_/g, " ") });
}

function formatDate(value: string | null, t: any): string {
  if (!value) {
    return t("Violations.noDate");
  }

  return new Date(value).toLocaleDateString();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    gap: spacing.md,
    padding: spacing.md,
    paddingBottom: 120, // Adjusted for more compact footer
  },
  summaryCard: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    ...shadows.md,
    marginBottom: spacing.xs,
  },
  balance: {
    ...typography.display,
    marginTop: spacing.sm,
    fontWeight: "900",
    letterSpacing: -1,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  selectAllBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  tabs: {
    marginTop: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    paddingHorizontal: spacing.sm,
  },
  tab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: -1,
  },
  floatingFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    ...shadows.lg,
  },
  receiptButton: {
    minWidth: 140,
    height: 48,
  },
  outstandingRow: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    ...shadows.sm,
  },
  rowTop: {
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  description: {
    ...typography.bodyStrong,
    flex: 1,
    fontSize: 16,
  },
  amount: {
    ...typography.h3,
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
