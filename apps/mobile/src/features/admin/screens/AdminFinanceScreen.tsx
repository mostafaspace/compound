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
import { isRtlLanguage, rowDirectionStyle, textDirectionStyle } from '../../../i18n/direction';

const FINANCE_FILTERS = ["pending", "approved", "rejected"] as const;

export const AdminFinanceScreen = () => {
  const { t, i18n } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const isRtl = isRtlLanguage(i18n.language);
  
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
    <View style={[styles.card, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light, borderColor: isDark ? colors.border.dark : colors.border.light }, textDirectionStyle(isRtl)]}>
      <View style={[styles.cardHeader, rowDirectionStyle(isRtl)]}>
        <View style={textDirectionStyle(isRtl)}>
          <Typography variant="h3" style={textDirectionStyle(isRtl)}>{item.unit?.unitNumber || t("Common.unknown")}</Typography>
          <Typography variant="caption" style={textDirectionStyle(isRtl)}>{item.user?.name}</Typography>
        </View>
        <Typography variant="h2" style={[{ color: colors.primary.light }, textDirectionStyle(isRtl)]}>
          {item.amount} {item.currency}
        </Typography>
      </View>
      
      <View style={[styles.cardBody, textDirectionStyle(isRtl)]}>
        <View style={[styles.infoRow, rowDirectionStyle(isRtl)]}>
          <Typography variant="label" style={textDirectionStyle(isRtl)}>{t("Finance.method")}:</Typography>
          <Typography variant="body" style={[styles.infoValue, textDirectionStyle(isRtl)]}>{t(`Finance.methods.${item.method}`)}</Typography>
        </View>
        <View style={[styles.infoRow, rowDirectionStyle(isRtl)]}>
          <Typography variant="label" style={textDirectionStyle(isRtl)}>{t("Finance.reference")}:</Typography>
          <Typography variant="body" style={[styles.infoValue, textDirectionStyle(isRtl)]}>{item.reference || "-"}</Typography>
        </View>
        <View style={[styles.infoRow, rowDirectionStyle(isRtl)]}>
          <Typography variant="label" style={textDirectionStyle(isRtl)}>{t("Common.date")}:</Typography>
          <Typography variant="body" style={[styles.infoValue, textDirectionStyle(isRtl)]}>{formatDate(item.createdAt, isRtl ? 'ar-EG' : 'en-US')}</Typography>
        </View>
      </View>

      {item.status === 'pending' && (
        <View style={[styles.actions, rowDirectionStyle(isRtl)]}>
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
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'approved' ? 'rgba(20, 184, 166, 0.1)' : 'rgba(239, 68, 68, 0.1)', alignSelf: isRtl ? 'flex-end' : 'flex-start' }]}>
          <Typography variant="label" style={[{ color: item.status === 'approved' ? colors.success : colors.error, textTransform: 'uppercase' }, textDirectionStyle(isRtl)]}>
            {t(`Common.statuses.${item.status}`)}
          </Typography>
        </View>
      )}
    </View>
  );
  const renderFilter = ({ item: f }: { item: (typeof FINANCE_FILTERS)[number] }) => (
    <Pressable
      onPress={() => setFilter(f)}
      style={[
        styles.filterChip,
        { backgroundColor: filter === f ? colors.primary.light : (isDark ? colors.background.dark : "#f3f4f6") }
      ]}
    >
      <Typography
        variant="label"
        style={[{
          color: filter === f ? colors.text.inverse : (isDark ? colors.text.secondary.dark : colors.text.secondary.light),
          textTransform: 'capitalize',
        }, textDirectionStyle(isRtl)]}
      >
        {t(`Common.statuses.${f}`)}
      </Typography>
    </Pressable>
  );

  return (
    <ScreenContainer withKeyboard={false} style={styles.container}>
      <View style={[styles.header, textDirectionStyle(isRtl)]}>
        <Typography variant="h1" style={textDirectionStyle(isRtl)}>{t("Finance.label")}</Typography>
        <Typography variant="caption" style={textDirectionStyle(isRtl)}>{t("Admin.financeDescription")}</Typography>
      </View>

      <FlatList
        data={FINANCE_FILTERS}
        keyExtractor={(f) => f}
        renderItem={renderFilter}
        horizontal
        inverted={isRtl}
        scrollEnabled={false}
        contentContainerStyle={[styles.filterRow, rowDirectionStyle(isRtl)]}
      />

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
