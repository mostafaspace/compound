import React, { useState } from 'react';
import { View, StyleSheet, useColorScheme, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useValidatePassMutation, usePerformVisitorActionMutation } from '../../../services/security';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { Typography } from '../../../components/ui/Typography';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { colors, spacing, shadows } from '../../../theme';

export const ScannerScreen = () => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';

  const [token, setToken] = useState('');
  const [validatePass, { isLoading: isValidating }] = useValidatePassMutation();
  const [performAction, { isLoading: isPerforming }] = usePerformVisitorActionMutation();

  const [scanResult, setScanResult] = useState<{
    valid: boolean;
    visitorName?: string;
    visitorRequestId?: string;
    unitNumber?: string;
    message?: string;
  } | null>(null);

  const handleScan = async () => {
    if (!token.trim()) return;
    setScanResult(null);

    try {
      const result = await validatePass(token.trim()).unwrap();
      const isValid = result.result === 'valid';
      const vr = result.visitorRequest;

      setScanResult({
        valid: isValid,
        visitorName: vr?.visitorName,
        visitorRequestId: vr?.id,
        unitNumber: vr?.unit?.unitNumber,
        message: isValid
          ? `Valid pass for ${vr?.visitorName}`
          : `Invalid or expired pass`,
      });

      if (isValid && vr) {
        Alert.alert(
          t('Security.verified', 'Visitor Verified'),
          `${vr.visitorName} - Unit ${vr.unit?.unitNumber}\n\n${t('Security.allowOrDeny', 'Allow or deny entry?')}`,
          [
            {
              text: t('Security.allow', 'Allow Entry'),
              onPress: async () => {
                await performAction({
                  id: vr.id,
                  action: 'allow',
                }).unwrap();
                setScanResult((prev) =>
                  prev ? { ...prev, message: t('Security.allowed', 'Visitor allowed entry') } : null
                );
              },
            },
            {
              text: t('Security.deny', 'Deny Entry'),
              style: 'destructive',
              onPress: async () => {
                await performAction({
                  id: vr.id,
                  action: 'deny',
                }).unwrap();
                setScanResult((prev) =>
                  prev ? { ...prev, message: t('Security.denied', 'Visitor denied entry') } : null
                );
              },
            },
            { text: t('Common.dismiss', 'Dismiss'), style: 'cancel' },
          ]
        );
      }
    } catch (err: any) {
      setScanResult({
        valid: false,
        message: err.data?.message || t('Security.invalidToken', 'Invalid token'),
      });
    }
  };

  const handleReset = () => {
    setScanResult(null);
    setToken('');
  };

  return (
    <ScreenContainer style={styles.container}>
      {!scanResult ? (
        <>
          <View style={styles.header}>
            <Typography variant="h1">{t('Security.scanner', 'QR Scanner')}</Typography>
            <Typography variant="caption" style={styles.subtitle}>
              {t('Security.scanHint', 'Enter or scan visitor QR token')}
            </Typography>
          </View>

          <View style={styles.inputSection}>
            <Input
              label={t('Security.tokenLabel', 'QR Token')}
              onChangeText={setToken}
              placeholder={t('Security.tokenPlaceholder', 'Enter QR token...')}
              value={token}
              containerStyle={styles.inputContainer}
            />
            <Button
              title={t('Security.validate', 'Validate')}
              onPress={handleScan}
              loading={isValidating}
              style={styles.scanButton}
            />
          </View>

          <View style={styles.placeholder}>
            <Typography style={{ fontSize: 64 }}>📷</Typography>
            <Typography variant="caption" style={styles.placeholderText}>
              {t('Security.cameraComing', 'Camera scanning coming soon')}
            </Typography>
          </View>
        </>
      ) : (
        <View style={styles.resultContainer}>
          <View
            style={[
              styles.resultCard,
              {
                backgroundColor: isDark ? colors.surface.dark : colors.surface.light,
                borderColor: scanResult.valid ? colors.success : colors.error,
              },
            ]}
          >
            <View style={styles.resultIcon}>
              <Typography style={{ fontSize: 48 }}>
                {scanResult.valid ? '✅' : '❌'}
              </Typography>
            </View>
            <Typography variant="h2" style={styles.resultTitle}>
              {scanResult.valid
                ? t('Security.validPass', 'Valid Pass')
                : t('Security.invalidPass', 'Invalid Pass')}
            </Typography>
            {scanResult.message && (
              <Typography variant="body" style={styles.resultMessage}>
                {scanResult.message}
              </Typography>
            )}
            {scanResult.visitorName && (
              <Typography variant="body" style={styles.resultDetail}>
                {t('Security.visitor', 'Visitor')}: {scanResult.visitorName}
              </Typography>
            )}
            {scanResult.unitNumber && (
              <Typography variant="body" style={styles.resultDetail}>
                {t('Security.unit', 'Unit')}: {scanResult.unitNumber}
              </Typography>
            )}
            <Button
              title={t('Security.scanAnother', 'Scan Another')}
              onPress={handleReset}
              style={styles.resetButton}
            />
          </View>
        </View>
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
  inputSection: {
    marginBottom: spacing.xl,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  scanButton: {
    width: '100%',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: spacing.md,
    textAlign: 'center',
  },
  resultContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultCard: {
    width: '100%',
    maxWidth: 400,
    padding: spacing.xl,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    ...shadows.premium,
  },
  resultIcon: {
    marginBottom: spacing.md,
  },
  resultTitle: {
    marginBottom: spacing.md,
  },
  resultMessage: {
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  resultDetail: {
    marginBottom: spacing.xs,
  },
  resetButton: {
    marginTop: spacing.xl,
    width: '100%',
  },
});
