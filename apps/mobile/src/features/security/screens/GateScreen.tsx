import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  useColorScheme
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useGetPendingVisitorRequestsQuery, useValidatePassMutation, usePerformVisitorActionMutation } from '../../../services/security';
import { colors, layout, spacing, shadows, radii } from '../../../theme';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { Typography } from '../../../components/ui/Typography';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { Icon } from '../../../components/ui/Icon';
import { formatDate } from '../../../utils/formatters';
import { visitorStatusPalette } from '../../../theme/semantics';
import type { GuardStackParamList } from '../../../navigation/types';
import type { NavigationProp } from '@react-navigation/native';

export const GateScreen = () => {
  const { t } = useTranslation();
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
      <View style={{ gap: spacing.md }}>
        {item.status !== 'arrived' && (
          <Button
            title={t('Security.markArrived', 'Mark Arrived')}
            onPress={() => handleVisitorAction(item.id, 'arrive')}
            variant="outline"
            style={{ height: 44 }}
            loading={isPerforming}
          />
        )}
        <View style={styles.actionRow}>
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
      </View>
    );
  };

  const renderVisitorItem = ({ item }: { item: any }) => {
    const statusPalette = visitorStatusPalette(item.status);

    return (
      <View style={[styles.card, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light, borderColor: isDark ? colors.border.dark : colors.border.light }]}>
        <View style={styles.cardHeader}>
          <View style={styles.visitorTitle}>
            <View style={styles.visitorIcon}>
              <Icon name="visitors" color={colors.primary.light} size={20} />
            </View>
            <Typography variant="h3">{item.visitorName}</Typography>
          </View>
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
    <ScreenContainer withKeyboard style={styles.container}>
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
          leftIcon="qr"
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
    padding: layout.cardPadding,
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
    paddingHorizontal: spacing.md,
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
    borderRadius: radii.md,
  },
  listSection: {
    flex: 1,
    paddingHorizontal: layout.screenGutter,
    marginTop: layout.sectionGap,
  },
  subTitle: {
    marginBottom: spacing.md,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  card: {
    padding: layout.cardPadding,
    borderRadius: radii.xl,
    borderWidth: 1,
    marginBottom: layout.listGap,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  visitorTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  visitorIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted.light,
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
