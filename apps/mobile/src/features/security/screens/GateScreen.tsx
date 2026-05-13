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
import { Card } from '../../../components/ui/Card';
import { visitorStatusPalette } from '../../../theme/semantics';
import { Icon } from '../../../components/ui/Icon';
import { formatDate } from '../../../utils/formatters';
import type { GuardStackParamList } from '../../../navigation/types';
import type { NavigationProp } from '@react-navigation/native';
import { isRtlLanguage, rowDirectionStyle, textDirectionStyle } from '../../../i18n/direction';

export const GateScreen = () => {
  const { t, i18n } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const isRtl = isRtlLanguage(i18n.language);
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
        text: t(`Security.${action}Success`),
        type: 'success',
      });
      refetch();
    } catch (err: any) {
      setSecurityMessage({
        text: err.data?.message || t('Security.actionFailed'),
        type: 'error',
      });
    }
  };

  const renderActionButtons = (item: any) => {
    if (item.status === 'allowed') {
      return (
        <View style={[styles.actionRow, rowDirectionStyle(isRtl)]}>
          <Button
            title={t('Security.complete')}
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
            title={t('Security.markArrived')}
            onPress={() => handleVisitorAction(item.id, 'arrive')}
            variant="outline"
            style={{ height: 44 }}
            loading={isPerforming}
          />
        )}
        <View style={[styles.actionRow, rowDirectionStyle(isRtl)]}>
          <Button
            title={t("Security.allow")}
            onPress={() => handleVisitorAction(item.id, 'allow')}
            variant="success"
            style={styles.actionBtn}
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
      <Card style={{ marginBottom: layout.listGap }}>
        <View style={[styles.cardHeader, rowDirectionStyle(isRtl)]}>
          <View style={[styles.visitorTitle, rowDirectionStyle(isRtl)]}>
            <View style={styles.visitorIcon}>
              <Icon name="visitors" color={colors.primary.light} size={20} />
            </View>
            <Typography variant="h3" style={textDirectionStyle(isRtl)}>{item.visitorName}</Typography>
          </View>
          <StatusBadge
            label={t(`Common.statuses.${item.status}`, { defaultValue: item.status.replace(/_/g, ' ') })}
            backgroundColor={statusPalette.background}
            textColor={statusPalette.text}
          />
        </View>
        <Typography variant="caption" style={[styles.visitTime, textDirectionStyle(isRtl)]}>{formatDate(item.visitStartsAt, i18n.language === 'ar' ? 'ar-EG' : 'en-US')}</Typography>
        {renderActionButtons(item)}
      </Card>
    );
  };

  return (
    <ScreenContainer withKeyboard>
      <Card style={styles.validationSection}>
        <Typography variant="h3" style={[styles.sectionTitle, textDirectionStyle(isRtl)]}>{t("Security.verifyPass")}</Typography>
        <View style={[styles.inputRow, rowDirectionStyle(isRtl)]}>
          <Input
            onChangeText={setToken}
            placeholder={t("Security.tokenPlaceholder")}
            value={token}
            containerStyle={styles.inputContainer}
            textAlign={isRtl ? 'right' : 'left'}
          />
          <Button
            title={t("Security.validate")}
            onPress={handleValidate}
            variant="primary"
            loading={isValidating}
            style={styles.checkBtn}
          />
        </View>
        <Button
          title={t("Security.openScanner")}
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
              textDirectionStyle(isRtl),
              { color: securityMessage.type === 'success' ? colors.success : colors.error }
            ]}
          >
            {securityMessage.text}
          </Typography>
        )}
      </Card>

      <View style={styles.listSection}>
        <Typography variant="h2" style={[styles.subTitle, textDirectionStyle(isRtl)]}>{t("Security.subtitle")}</Typography>
        <FlatList
          data={visitors}
          keyExtractor={(item) => item.id}
          renderItem={renderVisitorItem}
          refreshing={isLoadingVisitors}
          onRefresh={refetch}
          ListEmptyComponent={<Typography variant="caption" style={[styles.emptyText, textDirectionStyle(isRtl)]}>{t("Security.noPending")}</Typography>}
          contentContainerStyle={styles.listContent}
        />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  validationSection: {
    marginBottom: layout.sectionGap,
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
    height: 56,
    paddingHorizontal: spacing.xl,
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
  },
  subTitle: {
    marginBottom: spacing.md,
  },
  listContent: {
    paddingBottom: spacing.xl,
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
    paddingHorizontal: spacing.sm,
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
