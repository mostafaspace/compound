import React, { useState } from 'react';
import { View, StyleSheet, FlatList, useColorScheme, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { 
  useGetFinancePaymentSubmissionsQuery, 
  useApprovePaymentMutation, 
  useRejectPaymentMutation 
} from '../../../services/admin';
import { colors, layout, radii, spacing } from '../../../theme';
import { Typography } from '../../../components/ui/Typography';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { Button } from '../../../components/ui/Button';
import { formatDate } from '../../../utils/formatters';

export const AdminFinanceScreen = () => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  
  const [filter, setFilter] = useState<string>("pending");
  const { data: submissions = [], isLoading, refetch } = useGetFinancePaymentSubmissionsQuery(filter);
  
  const [approvePayment, { isLoading: isApproving }] = useApprovePaymentMutation();
  const [rejectPayment, { isLoading: isRejecting }] = useRejectPaymentMutation();

  const handleApprove = (id: string) => {
    Alert.alert(
      t("Admin.approvePaymentTitle", "Approve Payment"),
      t("Admin.approvePaymentConfirm", "Are you sure you want to approve this payment?"),
      [
        { text: t("Common.cancel"), style: "cancel" },
        { 
          text: t("Common.approve"), 
          onPress: async () => {
            try {
              await approvePayment({ id }).unwrap();
              Alert.alert(t("Common.success"), t("Admin.paymentApproved", "Payment has been approved."));
            } catch (err) {
              Alert.alert(t("Common.error"), t("Admin.approveError", "Failed to approve payment."));
            }
          } 
        }
      ]
    );
  };

  const handleReject = (id: string) => {
    Alert.prompt(
      t("Admin.rejectPaymentTitle", "Reject Payment"),
      t("Admin.rejectPaymentReason", "Please enter the reason for rejection:"),
      [
        { text: t("Common.cancel"), style: "cancel" },
        { 
          text: t("Common.reject"), 
          onPress: async (reason: string | undefined) => {
            if (!reason) return;
            try {
              await rejectPayment({ id, reason }).unwrap();
              Alert.alert(t("Common.success"), t("Admin.paymentRejected", "Payment has been rejected."));
            } catch (err) {
              Alert.alert(t("Common.error"), t("Admin.rejectError", "Failed to reject payment."));
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.card, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light, borderColor: isDark ? colors.border.dark : colors.border.light }]}>
      <View style={styles.cardHeader}>
        <View>
          <Typography variant="h3">{item.unit?.unitNumber || t("Common.unknown")}</Typography>
          <Typography variant="caption">{item.user?.name}</Typography>
        </View>
        <Typography variant="h2" style={{ color: colors.primary.light }}>
          {item.amount} {item.currency}
        </Typography>
      </View>
      
      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Typography variant="label">{t("Finance.method")}:</Typography>
          <Typography variant="body" style={styles.infoValue}>{t(`Finance.methods.${item.method}`)}</Typography>
        </View>
        <View style={styles.infoRow}>
          <Typography variant="label">{t("Finance.reference")}:</Typography>
          <Typography variant="body" style={styles.infoValue}>{item.reference || "-"}</Typography>
        </View>
        <View style={styles.infoRow}>
          <Typography variant="label">{t("Common.date")}:</Typography>
          <Typography variant="body" style={styles.infoValue}>{formatDate(item.createdAt)}</Typography>
        </View>
      </View>

      {item.status === 'pending' && (
        <View style={styles.actions}>
          <Button 
            title={t("Common.reject")} 
            variant="outline" 
            onPress={() => handleReject(item.id)} 
            style={styles.actionButton}
            textStyle={{ color: colors.error }}
          />
          <Button 
            title={t("Common.approve")} 
            onPress={() => handleApprove(item.id)} 
            style={styles.actionButton}
          />
        </View>
      )}
      
      {item.status !== 'pending' && (
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'approved' ? 'rgba(20, 184, 166, 0.1)' : 'rgba(239, 68, 68, 0.1)' }]}>
          <Typography variant="label" style={{ color: item.status === 'approved' ? colors.success : colors.error, textTransform: 'uppercase' }}>
            {item.status}
          </Typography>
        </View>
      )}
    </View>
  );

  return (
    <ScreenContainer withKeyboard={false} style={styles.container}>
      <View style={styles.header}>
        <Typography variant="h1">{t("Finance.label", "Finance")}</Typography>
        <Typography variant="caption">{t("Admin.financeDescription", "Review and approve payment submissions")}</Typography>
      </View>

      <View style={styles.filterRow}>
        {["pending", "approved", "rejected"].map((f) => (
          <Pressable 
            key={f} 
            onPress={() => setFilter(f)}
            style={[
              styles.filterChip, 
              { backgroundColor: filter === f ? colors.primary.light : (isDark ? colors.background.dark : "#f3f4f6") }
            ]}
          >
            <Typography
              variant="label"
              style={{
                color: filter === f ? colors.text.inverse : (isDark ? colors.text.secondary.dark : colors.text.secondary.light),
                textTransform: 'capitalize',
              }}
            >
              {t(`Common.${f}`, f)}
            </Typography>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={submissions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshing={isLoading}
        onRefresh={refetch}
        ListEmptyComponent={
          <View style={styles.center}>
            <Typography variant="caption">
              {isLoading ? t("Common.loading") : t("Finance.noSubmissions", "No payment submissions found")}
            </Typography>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 0,
  },
  header: {
    padding: layout.screenGutter,
    paddingBottom: spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: layout.screenGutter,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  listContent: {
    padding: layout.screenGutter,
    paddingTop: 0,
  },
  card: {
    padding: layout.cardPadding,
    borderRadius: radii.xl,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  cardBody: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoValue: {
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    height: 44,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  }
});
