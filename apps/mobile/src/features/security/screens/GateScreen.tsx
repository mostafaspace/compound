import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  useColorScheme,
  SafeAreaView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { useGetPendingVisitorRequestsQuery, useValidatePassMutation, usePerformVisitorActionMutation } from '../../../services/security';
import { logout as logoutAction } from '../../../store/authSlice';
import * as Keychain from "react-native-keychain";
import { colors, spacing, shadows } from '../../../theme';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { Typography } from '../../../components/ui/Typography';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { LogoutButton } from '../../../components/ui/LogoutButton';
import { formatDate } from '../../../utils/formatters';
import { visitorStatusPalette } from '../../../theme/semantics';
import type { GuardStackParamList } from '../../../navigation/types';
import type { NavigationProp } from '@react-navigation/native';

const authTokenService = "compound.mobile.authToken";

export const GateScreen = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const isDark = useColorScheme() === 'dark';
  const navigation = useNavigation<NavigationProp<GuardStackParamList>>();

  const [token, setToken] = useState("");
  const [securityMessage, setSecurityMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const { data: visitors = [], isLoading: isLoadingVisitors, refetch } = useGetPendingVisitorRequestsQuery();
  const [validatePass, { isLoading: isValidating }] = useValidatePassMutation();
  const [performAction, { isLoading: isPerforming }] = usePerformVisitorActionMutation();

  const handleValidate = async () => {
    if (!token.trim()) return;
    setSecurityMessage(null);
    try {
      const result = await validatePass(token.trim()).unwrap();
      const visitorLabel = result.visitorRequest?.visitorName
        ? ` • ${result.visitorRequest.visitorName}`
        : '';
      setSecurityMessage({ text: `${t("Security.result")}: ${result.result}${visitorLabel}`, type: 'success' });
      setToken("");
    } catch (err: any) {
      setSecurityMessage({ text: err.data?.message || t("Security.invalidToken"), type: 'error' });
    }
  };

  const handleVisitorAction = async (id: string, action: 'arrive' | 'allow' | 'deny' | 'complete') => {
    try {
      await performAction({ id, action }).unwrap();
      setSecurityMessage({
        text: t(`Security.${action}Success`, `${action} complete`),
        type: 'success',
      });
      refetch();
    } catch (err: any) {
      setSecurityMessage({
        text: err.data?.message || t('Security.actionFailed', 'Visitor action could not be completed.'),
        type: 'error',
      });
    }
  };

  const renderActionButtons = (item: any) => {
    if (item.status === 'allowed') {
      return (
        <View style={styles.actionRow}>
          <Button
            title={t('Security.complete', 'Complete')}
            onPress={() => handleVisitorAction(item.id, 'complete')}
            style={[styles.actionBtn, styles.completeBtn]}
            loading={isPerforming}
          />
        </View>
      );
    }

    return (
      <View style={styles.actionRow}>
        {item.status !== 'arrived' ? (
          <Button
            title={t('Security.markArrived', 'Mark Arrived')}
            onPress={() => handleVisitorAction(item.id, 'arrive')}
            variant="outline"
            style={styles.actionBtn}
            loading={isPerforming}
          />
        ) : null}
        <Button
          title={t("Security.allow")}
          onPress={() => handleVisitorAction(item.id, 'allow')}
          style={[styles.actionBtn, styles.allowBtn]}
          loading={isPerforming}
        />
        <Button
          variant="outline"
          title={t("Security.deny")}
          onPress={() => handleVisitorAction(item.id, 'deny')}
          style={[styles.actionBtn, { borderColor: colors.error }]}
          textStyle={{ color: colors.error }}
          loading={isPerforming}
        />
      </View>
    );
  };

  const renderVisitorItem = ({ item }: { item: any }) => {
    const statusPalette = visitorStatusPalette(item.status);

    return (
      <View style={[styles.card, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light, borderColor: isDark ? colors.border.dark : colors.border.light }]}>
        <View style={styles.cardHeader}>
          <Typography variant="h3">{item.visitorName}</Typography>
          <StatusBadge
            label={item.status.replace(/_/g, ' ')}
            backgroundColor={statusPalette.background}
            textColor={statusPalette.text}
          />
        </View>
        <Typography variant="caption" style={styles.visitTime}>{formatDate(item.visitStartsAt)}</Typography>
        {renderActionButtons(item)}
      </View>
    );
  };

  return (
    <ScreenContainer withKeyboard style={styles.container} edges={['left', 'right', 'bottom']}>
      <View style={[styles.validationSection, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light }]}>
        <Typography variant="h3" style={styles.sectionTitle}>{t("Security.verifyPass", "Verify Pass")}</Typography>
        <View style={styles.inputRow}>
          <Input
            onChangeText={setToken}
            placeholder={t("Security.tokenPlaceholder", "Enter code or scan...")}
            value={token}
            containerStyle={styles.inputContainer}
          />
          <Button
            title={t("Security.validate", "Check")}
            onPress={handleValidate}
            loading={isValidating}
            style={styles.checkBtn}
          />
        </View>
        <Button
          title={t("Security.openScanner", "Open Scanner")}
          onPress={() => navigation.navigate('Scanner')}
          variant="outline"
          style={styles.scannerShortcut}
        />
        {securityMessage && (
          <Typography
            variant="body"
            style={[
              styles.message,
              { color: securityMessage.type === 'success' ? colors.success : colors.error }
            ]}
          >
            {securityMessage.text}
          </Typography>
        )}
      </View>

      <View style={styles.listSection}>
        <Typography variant="h2" style={styles.subTitle}>{t("Security.subtitle")}</Typography>
        <FlatList
          data={visitors}
          keyExtractor={(item) => item.id}
          renderItem={renderVisitorItem}
          refreshing={isLoadingVisitors}
          onRefresh={refetch}
          ListEmptyComponent={<Typography variant="caption" style={styles.emptyText}>{t("Security.noPending")}</Typography>}
          contentContainerStyle={styles.listContent}
        />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 0,
  },
  validationSection: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    ...shadows.sm,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  inputContainer: {
    flex: 1,
  },
  checkBtn: {
    height: 48,
    paddingHorizontal: spacing.lg,
  },
  scannerShortcut: {
    marginTop: spacing.sm,
  },
  message: {
    fontWeight: '700',
    marginTop: spacing.sm,
    textAlign: 'center',
    padding: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 8,
  },
  listSection: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  subTitle: {
    marginBottom: spacing.md,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  card: {
    padding: spacing.lg,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  visitTime: {
    marginBottom: spacing.md,
    color: colors.text.secondary.light,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionBtn: {
    flex: 1,
    height: 44,
  },
  allowBtn: {
    backgroundColor: colors.success,
  },
  completeBtn: {
    backgroundColor: colors.info,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: spacing.xl,
    color: colors.text.secondary.light,
  }
});
