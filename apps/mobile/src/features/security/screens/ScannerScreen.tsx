import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  useColorScheme,
  Linking,
  AppState,
  FlatList,
} from 'react-native';
import {
  BarcodeScanner,
  CameraView,
} from '@pushpendersingh/react-native-scanner';
import { useTranslation } from 'react-i18next';
import { useValidatePassMutation, usePerformVisitorActionMutation } from '../../../services/security';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { Typography } from '../../../components/ui/Typography';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { colors, layout, spacing, shadows, radii } from '../../../theme';
import { visitorStatusPalette } from '../../../theme/semantics';
import { Icon } from '../../../components/ui/Icon';
import {
  appendScannerHistoryEntry,
  getScannerAvailableActions,
  normalizeScannedVisitorToken,
  type ScannerHistoryEntry,
} from '../scanner-utils';
import { isRtlLanguage, rowDirectionStyle, textDirectionStyle } from '../../../i18n/direction';

function ScannerPreview({ onScanned, isRtl }: { onScanned: (value: string) => void; isRtl: boolean }) {
  const { t } = useTranslation();
  const scannedRef = useRef(false);

  useEffect(() => {
    BarcodeScanner.startScanning((barcodes) => {
      if (scannedRef.current || barcodes.length === 0) return;
      const qr = barcodes.find((b) => b.type === 'QR_CODE') ?? barcodes[0];
      if (qr?.data) {
        scannedRef.current = true;
        BarcodeScanner.stopScanning();
        onScanned(qr.data);
      }
    });

    return () => {
      BarcodeScanner.stopScanning();
      BarcodeScanner.releaseCamera();
    };
  }, [onScanned]);

  return (
    <View style={styles.cameraViewport}>
      <CameraView style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={styles.cameraOverlay}>
        <View style={styles.scanFrame} />
        <Typography variant="caption" style={[styles.overlayText, textDirectionStyle(isRtl)]}>
          {t('Security.alignFrame')}
        </Typography>
      </View>
    </View>
  );
}

export const ScannerScreen = () => {
  const { t, i18n } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const isRtl = isRtlLanguage(i18n.language);

  const [token, setToken] = useState('');
  const [scannerEnabled, setScannerEnabled] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanHistory, setScanHistory] = useState<ScannerHistoryEntry[]>([]);
  const [validatePass, { isLoading: isValidating }] = useValidatePassMutation();
  const [performAction, { isLoading: isPerforming }] = usePerformVisitorActionMutation();
  const scanLockRef = useRef(false);

  const [scanResult, setScanResult] = useState<{
    valid: boolean;
    scanOutcome: 'valid' | 'expired' | 'already_used' | 'denied' | 'cancelled' | 'not_found' | 'out_of_window';
    visitorStatus?: 'pending' | 'qr_issued' | 'arrived' | 'allowed' | 'denied' | 'completed' | 'cancelled' | null;
    visitorName?: string;
    visitorRequestId?: string;
    unitNumber?: string;
    message?: string;
    scannedAt?: string;
  } | null>(null);

  useEffect(() => {
    BarcodeScanner.hasCameraPermission().then(setHasPermission);
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        BarcodeScanner.hasCameraPermission().then(setHasPermission);
      }
    });
    return () => sub.remove();
  }, []);

  const handleProcessToken = useCallback(async (rawToken: string) => {
    const normalizedToken = normalizeScannedVisitorToken(rawToken);

    if (!normalizedToken || scanLockRef.current) {
      return;
    }

    scanLockRef.current = true;
    setToken(normalizedToken);
    setScanResult(null);

    try {
      const result = await validatePass(normalizedToken).unwrap();
      const isValid = result.result === 'valid';
      const vr = result.visitorRequest;
      const scannedAt = new Date().toISOString();
      const title = isValid
        ? t('Security.validPass')
        : t('Security.invalidPass');
      const detail = isValid && vr
        ? `${vr.visitorName} • ${t('Apartments.unitNumber', { number: vr.unit?.unitNumber ?? t('Common.notAvailable') })}`
        : t('Security.invalidToken');

      setScanResult({
        valid: isValid,
        scanOutcome: result.result,
        visitorStatus: vr?.status,
        visitorName: vr?.visitorName,
        visitorRequestId: vr?.id,
        unitNumber: vr?.unit?.unitNumber,
        message: isValid
          ? t('Security.allowSuccess')
          : t('Security.invalidToken'),
        scannedAt,
      });
      setScanHistory((current) => appendScannerHistoryEntry(current, {
        id: `${scannedAt}-${normalizedToken}`,
        status: isValid ? 'valid' : 'invalid',
        title,
        detail,
        scannedAt,
      }));
    } catch (err: any) {
      const scannedAt = new Date().toISOString();
      const message = err.data?.message || t('Security.invalidToken');

      setScanResult({
        valid: false,
        scanOutcome: 'not_found',
        visitorStatus: null,
        message,
        scannedAt,
      });
      setScanHistory((current) => appendScannerHistoryEntry(current, {
        id: `${scannedAt}-${normalizedToken}`,
        status: 'invalid',
        title: t('Security.invalidPass'),
        detail: message,
        scannedAt,
      }));
    } finally {
      setScannerEnabled(false);
      scanLockRef.current = false;
    }
  }, [validatePass, t]);

  const handleManualValidate = async () => {
    await handleProcessToken(token);
  };

  const handleReset = () => {
    setScanResult(null);
    setToken('');
    scanLockRef.current = false;
    setScannerEnabled(true);
  };

  const handleCloseScanner = () => {
    scanLockRef.current = false;
    setScannerEnabled(false);
  };

  const handleRequestPermission = async () => {
    const granted = await BarcodeScanner.requestCameraPermission();
    setHasPermission(granted);
    if (!granted) {
      await Linking.openSettings();
    }
  };

  const handleVisitorAction = async (action: 'arrive' | 'allow' | 'deny' | 'complete') => {
    if (!scanResult?.visitorRequestId) {
      return;
    }

    try {
      await performAction({
        id: scanResult.visitorRequestId,
        action,
      }).unwrap();

      const messageMap = {
        arrive: t('Security.arrived'),
        allow: t('Security.allowed'),
        deny: t('Security.denied'),
        complete: t('Security.completeSuccess'),
      };
      setScanResult((prev) => {
        if (!prev) {
          return null;
        }

        const nextVisitorStatus = {
          arrive: 'arrived',
          allow: 'allowed',
          deny: 'denied',
          complete: 'completed',
        } as const;

        const nextScanOutcome = {
          arrive: prev.scanOutcome,
          allow: 'already_used',
          deny: 'denied',
          complete: 'already_used',
        } as const;

        return {
          ...prev,
          message: messageMap[action],
          visitorStatus: nextVisitorStatus[action],
          scanOutcome: nextScanOutcome[action],
        };
      });
    } catch (err: any) {
      setScanResult((prev) => prev ? {
        ...prev,
        valid: false,
        message: err.data?.message || t('Security.actionFailed'),
      } : null);
    }
  };

  const surfaceColor = isDark ? colors.surface.dark : colors.surface.light;
  const borderColor = isDark ? colors.border.dark : colors.border.light;
  const availableActions = scanResult
    ? getScannerAvailableActions({
      scanResult: scanResult.scanOutcome,
      visitorStatus: scanResult.visitorStatus,
    })
    : [];

  const renderHistoryItem = ({ item: entry }: { item: ScannerHistoryEntry }) => (
    <View style={[styles.historyRow, rowDirectionStyle(isRtl)]}>
      <View style={[
        styles.historyDot,
        { backgroundColor: entry.status === 'valid' ? colors.success : colors.error },
        isRtl ? { marginLeft: spacing.sm } : { marginRight: spacing.sm }
      ]} />
      <View style={[styles.historyText, { alignItems: isRtl ? 'flex-end' : 'flex-start' }]}>
        <Typography variant="label" style={textDirectionStyle(isRtl)}>{entry.title}</Typography>
        <Typography variant="caption" style={[styles.historyDetail, textDirectionStyle(isRtl)]}>{entry.detail}</Typography>
      </View>
      <Typography variant="caption" style={[styles.historyTime, textDirectionStyle(isRtl)]}>
        {new Date(entry.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Typography>
    </View>
  );

  return (
    <ScreenContainer scrollable>
      <View style={[styles.header, textDirectionStyle(isRtl)]}>
        <Typography variant="h1" style={textDirectionStyle(isRtl)}>{t('Security.scanner')}</Typography>
        <Typography variant="caption" style={[styles.subtitle, textDirectionStyle(isRtl)]}>
          {t('Security.scanHint')}
        </Typography>
      </View>

      <Card style={styles.cameraCard} contentStyle={{ padding: 0 }}>
        <View style={[styles.cameraHeader, rowDirectionStyle(isRtl)]}>
          <View style={{ flex: 1, alignItems: isRtl ? 'flex-end' : 'flex-start' }}>
            <Typography variant="label" style={[styles.cameraTitle, textDirectionStyle(isRtl)]}>
              {t('Security.liveScanner')}
            </Typography>
            <Typography variant="caption" style={[styles.cameraSubtitle, textDirectionStyle(isRtl)]}>
              {scannerEnabled
                ? t('Security.cameraOpen')
                : t('Security.cameraClosed')}
            </Typography>
          </View>
          {scannerEnabled ? (
            <Button
              title={t('Common.close')}
              onPress={handleCloseScanner}
              variant="outline"
              style={styles.cameraHeaderButton}
            />
          ) : (
            <Button
              title={t('Security.openScanner')}
              onPress={handleReset}
              variant="primary"
              style={styles.cameraHeaderButton}
            />
          )}
        </View>
        {hasPermission === false ? (
          <View style={styles.placeholder}>
            <View style={styles.placeholderIcon}>
              <Icon name="camera" color={colors.primary.light} size={48} />
            </View>
            <Typography variant="body" style={[styles.placeholderText, textDirectionStyle(isRtl)]}>
              {t('Security.cameraPermissionNeeded')}
            </Typography>
            <Button
              title={t('Security.enableCamera')}
              onPress={handleRequestPermission}
              variant="primary"
              style={styles.permissionButton}
            />
          </View>
        ) : scannerEnabled ? (
          <ScannerPreview onScanned={(value) => { void handleProcessToken(value); }} isRtl={isRtl} />
        ) : (
          <View style={styles.placeholder}>
            <View style={styles.placeholderIcon}>
              <Icon name="qr" color={colors.primary.light} size={48} />
            </View>
            <Typography variant="body" style={[styles.placeholderText, textDirectionStyle(isRtl)]}>
              {t('Security.scanAnotherHint')}
            </Typography>
            <Button
              title={t('Security.openScanner')}
              onPress={handleReset}
              variant="primary"
              style={styles.permissionButton}
            />
          </View>
        )}
      </Card>

      {scanResult ? (
        <View style={styles.resultContainer}>
          <View
            style={[
              styles.resultCard,
              {
                backgroundColor: surfaceColor,
                borderColor: scanResult.valid ? colors.success : colors.error,
              },
            ]}
          >
            <View style={styles.resultIcon}>
              <Icon name={scanResult.valid ? 'check' : 'x'} color={scanResult.valid ? colors.success : colors.error} size={42} />
            </View>
            <Typography variant="h2" style={[styles.resultTitle, textDirectionStyle(isRtl)]}>
              {scanResult.valid
                ? t('Security.validPass')
                : t('Security.invalidPass')}
            </Typography>
            {scanResult.message && (
              <Typography variant="body" style={[styles.resultMessage, textDirectionStyle(isRtl)]}>
                {scanResult.message}
              </Typography>
            )}
            {scanResult.visitorName && (
              <Typography variant="body" style={[styles.resultDetail, textDirectionStyle(isRtl)]}>
                {t('Security.visitor')}: {scanResult.visitorName}
              </Typography>
            )}
            {scanResult.unitNumber && (
              <Typography variant="body" style={[styles.resultDetail, textDirectionStyle(isRtl)]}>
                {t('Security.unit')}: {scanResult.unitNumber}
              </Typography>
            )}
            {scanResult.visitorStatus && (
              <View style={[styles.statusRow, rowDirectionStyle(isRtl)]}>
                <Typography variant="body" style={[styles.resultDetail, textDirectionStyle(isRtl)]}>
                  {t('Security.currentStatus')}:
                </Typography>
                <StatusBadge
                  label={t(`Common.statuses.${scanResult.visitorStatus}`, { defaultValue: scanResult.visitorStatus.replace(/_/g, ' ') })}
                  backgroundColor={visitorStatusPalette(scanResult.visitorStatus).background}
                  textColor={visitorStatusPalette(scanResult.visitorStatus).text}
                />
              </View>
            )}
            {scanResult.visitorRequestId && availableActions.length > 0 ? (
              <View style={[styles.resultActions, rowDirectionStyle(isRtl)]}>
                {availableActions.includes('arrive') ? (
                  <Button
                    title={t('Security.arrive')}
                    onPress={() => { void handleVisitorAction('arrive'); }}
                    variant="outline"
                    style={styles.resultActionButton}
                    loading={isPerforming}
                  />
                ) : null}
                {availableActions.includes('allow') ? (
                  <Button
                    title={t('Security.allow')}
                    onPress={() => { void handleVisitorAction('allow'); }}
                    variant="success"
                    style={styles.resultActionButton}
                    loading={isPerforming}
                  />
                ) : null}
                {availableActions.includes('deny') ? (
                  <Button
                    title={t('Security.deny')}
                    onPress={() => { void handleVisitorAction('deny'); }}
                    variant="outline"
                    style={[styles.resultActionButton, { borderColor: colors.error }]}
                    textStyle={{ color: colors.error }}
                    loading={isPerforming}
                  />
                ) : null}
                {availableActions.includes('complete') ? (
                  <Button
                    title={t('Security.complete')}
                    onPress={() => { void handleVisitorAction('complete'); }}
                    style={styles.resultActionButton}
                    loading={isPerforming}
                  />
                ) : null}
              </View>
            ) : null}
            <Button
              title={t('Security.scanAnother')}
              onPress={handleReset}
              variant="outline"
              style={styles.resetButton}
            />
          </View>
        </View>
      ) : null}

      <View style={styles.inputSection}>
        <Input
          label={t('Security.tokenLabel')}
          onChangeText={setToken}
          placeholder={t('Security.tokenPlaceholder')}
          value={token}
          containerStyle={styles.inputContainer}
          textAlign={isRtl ? 'right' : 'left'}
        />
        <Button
          title={t('Security.validate')}
          onPress={handleManualValidate}
          variant="primary"
          loading={isValidating || isPerforming}
          style={styles.scanButton}
        />
      </View>

      {scanHistory.length > 0 ? (
        <Card style={styles.historyCard}>
          <Typography variant="h3" style={[styles.historyTitle, textDirectionStyle(isRtl)]}>
            {t('Security.recentScans')}
          </Typography>
          <FlatList
            data={scanHistory}
            keyExtractor={(entry) => entry.id}
            renderItem={renderHistoryItem}
            scrollEnabled={false}
          />
        </Card>
      ) : null}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    marginBottom: layout.sectionGap,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
  cameraCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: layout.sectionGap,
    minHeight: 320,
  },
  cameraHeader: {
    padding: layout.cardPadding,
    paddingBottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  cameraHeaderButton: {
    minWidth: 132,
  },
  cameraTitle: {
    marginBottom: spacing.xs,
  },
  cameraSubtitle: {
    maxWidth: 240,
    color: colors.text.secondary.light,
  },
  cameraViewport: {
    height: 320,
    margin: spacing.lg,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.18)',
  },
  scanFrame: {
    width: 220,
    height: 220,
    borderRadius: radii.xl,
    borderWidth: 3,
    borderColor: '#fff',
    backgroundColor: 'transparent',
  },
  overlayText: {
    marginTop: spacing.md,
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
  },
  inputSection: {
    marginBottom: layout.sectionGap,
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
    paddingHorizontal: layout.cardPadding,
    paddingVertical: spacing.xxl,
  },
  placeholderIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.background.light,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  placeholderText: {
    marginTop: spacing.sm,
    textAlign: 'center',
    color: colors.text.secondary.light,
    maxWidth: '80%',
  },
  permissionButton: {
    marginTop: spacing.xl,
    minWidth: 200,
  },
  resultContainer: {
    marginBottom: layout.sectionGap,
  },
  resultCard: {
    width: '100%',
    padding: layout.heroPadding,
    borderRadius: radii.xl,
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
    color: colors.text.secondary.light,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  resultActions: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  resultActionButton: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
  resetButton: {
    marginTop: spacing.md,
    width: '100%',
  },
  historyCard: {
    marginTop: spacing.sm,
  },
  historyTitle: {
    marginBottom: spacing.md,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.18)',
  },
  historyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  historyText: {
    flex: 1,
  },
  historyDetail: {
    color: colors.text.secondary.light,
    marginTop: 2,
  },
  historyTime: {
    color: colors.text.secondary.light,
    fontVariant: ['tabular-nums'],
  },
});
