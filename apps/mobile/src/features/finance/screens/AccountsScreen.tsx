import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator,
  useColorScheme,
  Pressable,
  ScrollView,
  Modal,
  Text
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useGetUnitAccountsQuery, useGetAccountDetailQuery, useSubmitPaymentMutation } from '../../../services/finance';
import { colors, spacing, shadows, glass } from '../../../theme';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Typography } from '../../../components/ui/Typography';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { formatDate } from '../../../utils/formatters';

export const AccountsScreen = () => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  
  const { data: accounts = [], isLoading: isLoadingAccounts, refetch: refetchAccounts } = useGetUnitAccountsQuery();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);

  const { data: accountDetail, isFetching: isFetchingDetail } = useGetAccountDetailQuery(selectedAccountId!, { 
    skip: !selectedAccountId 
  });
  
  const [submitPayment, { isLoading: isSubmitting }] = useSubmitPaymentMutation();

  const handlePayment = async () => {
    if (!selectedAccountId || !paymentAmount.trim()) return;
    setPaymentMessage(null);
    try {
      const formData = new FormData();
      formData.append("amount", paymentAmount.trim());
      formData.append("method", paymentMethod);
      if (paymentReference.trim()) formData.append("reference", paymentReference.trim());
      if (paymentNotes.trim()) formData.append("notes", paymentNotes.trim());

      await submitPayment({
        accountId: selectedAccountId,
        body: formData,
      }).unwrap();

      setPaymentMessage(t("Finance.submitSuccess"));
      setTimeout(() => {
        setShowPaymentModal(false);
        setPaymentAmount("");
        setPaymentReference("");
        setPaymentNotes("");
        setPaymentMessage(null);
      }, 2000);
    } catch (err: any) {
      setPaymentMessage(err.data?.message || t("Finance.submitError"));
    }
  };

  const renderAccountItem = ({ item }: { item: any }) => (
    <View style={[
      styles.card, 
      isDark ? glass.dark : glass.light,
      shadows.lg
    ]}>
      <View style={styles.rowBetween}>
        <Typography variant="label">{t("Finance.balance")}</Typography>
        <Typography variant="h2" style={{ color: parseFloat(item.balance) < 0 ? colors.error : colors.success }}>
          {item.balance} {item.currency}
        </Typography>
      </View>
      
      <Button 
        variant="outline" 
        title={t("Finance.viewStatement")} 
        onPress={() => setSelectedAccountId(selectedAccountId === item.id ? null : item.id)}
        style={styles.actionButton}
      />

      {selectedAccountId === item.id && (
        <View style={styles.detailSection}>
          {isFetchingDetail ? (
            <ActivityIndicator color={colors.primary.dark} />
          ) : (
            <>
              <Typography variant="h3" style={styles.subTitle}>{t("Finance.recentTransactions")}</Typography>
              {(accountDetail?.ledgerEntries ?? []).slice(0, 5).map((entry: any) => (
                <View key={entry.id} style={styles.transactionItem}>
                  <View style={styles.rowBetween}>
                    <Typography style={styles.transactionText}>{entry.description || entry.type}</Typography>
                    <Typography style={[styles.transactionAmount, { color: entry.type === 'charge' ? colors.error : colors.success }] as any}>
                      {entry.amount}
                    </Typography>
                  </View>
                  <Typography variant="caption">{formatDate(entry.createdAt)}</Typography>
                </View>
              ))}
              
              <Button 
                title={t("Finance.submitPayment")} 
                onPress={() => setShowPaymentModal(true)}
                style={styles.paymentButton}
              />
            </>
          )}
        </View>
      )}
    </View>
  );

  return (
    <ScreenContainer withKeyboard={false} style={styles.container}>
      <FlatList
        data={accounts}
        keyExtractor={(item) => item.id}
        renderItem={renderAccountItem}
        refreshing={isLoadingAccounts}
        onRefresh={refetchAccounts}
        ListEmptyComponent={
          <View style={styles.center}>
            <Typography variant="caption">
              {isLoadingAccounts ? t("Common.loading") : t("Finance.noAccounts")}
            </Typography>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      <Modal visible={showPaymentModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light }]}>
            <Typography variant="h2" style={styles.modalTitle}>{t("Finance.submitPayment")}</Typography>
            
            <ScrollView style={styles.modalScroll}>
              <Input
                label={t("Finance.amount")}
                keyboardType="decimal-pad"
                onChangeText={setPaymentAmount}
                placeholder="0.00"
                value={paymentAmount}
              />

              <Typography variant="label" style={styles.inputLabel}>{t("Finance.method")}</Typography>
              <View style={styles.methodRow}>
                {["bank_transfer", "cash", "check"].map((m) => (
                  <Pressable 
                    key={m} 
                    onPress={() => setPaymentMethod(m)}
                    style={[styles.methodChip, paymentMethod === m && styles.methodChipSelected]}
                  >
                    <Text style={[styles.methodText, paymentMethod === m && styles.methodTextSelected]}>{t(`Finance.methods.${m}`)}</Text>
                  </Pressable>
                ))}
              </View>

              <Input
                label={t("Finance.reference")}
                onChangeText={setPaymentReference}
                placeholder={t("Finance.referencePlaceholder")}
                value={paymentReference}
              />

              {paymentMessage && (
                <Typography variant={paymentMessage.includes("success") ? "body" : "error"} style={styles.message}>
                  {paymentMessage}
                </Typography>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button title={t("Common.cancel")} variant="ghost" onPress={() => setShowPaymentModal(false)} />
              <Button title={t("Common.submit")} onPress={handlePayment} loading={isSubmitting} />
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 0,
  },
  listContent: {
    padding: spacing.md,
  },
  card: {
    padding: spacing.xl,
    borderRadius: 20,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButton: {
    marginTop: spacing.md,
  },
  detailSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  subTitle: {
    marginBottom: spacing.sm,
  },
  transactionItem: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  transactionText: {
    fontWeight: '500',
  },
  transactionAmount: {
    fontWeight: '700',
  },
  paymentButton: {
    marginTop: spacing.md,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.xl,
    maxHeight: '80%',
  },
  modalTitle: {
    marginBottom: spacing.lg,
  },
  modalScroll: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  methodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  methodChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  methodChipSelected: {
    backgroundColor: colors.primary.dark,
    borderColor: colors.primary.dark,
  },
  methodText: {
    fontSize: 12,
    color: '#4b5563',
  },
  methodTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  message: {
    marginTop: spacing.md,
    textAlign: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
  }
});
