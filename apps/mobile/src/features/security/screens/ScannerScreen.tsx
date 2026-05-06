import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  useColorScheme,
  Platform,
  Linking,
} from 'react-native';
import {
  Camera,
  isScannedCode,
  useCameraDevice,
  useCameraPermission,
  useObjectOutput,
} from 'react-native-vision-camera';
import { useTranslation } from 'react-i18next';
import { useValidatePassMutation, usePerformVisitorActionMutation } from '../../../services/security';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { Typography } from '../../../components/ui/Typography';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { colors, layout, spacing, shadows, radii } from '../../../theme';
import { Icon } from '../../../components/ui/Icon';
import {
  appendScannerHistoryEntry,
  getScannerAvailableActions,
  getScannerPreviewState,
  normalizeScannedVisitorToken,
  type ScannerHistoryEntry,
} from '../scanner-utils';

function IOSScannerPreview({ onScanned }: { onScanned: (value: string) => void }) {
  const backCameraDevice = useCameraDevice('back');
  const frontCameraDevice = useCameraDevice('front');
  const previewState = getScannerPreviewState({
    hasBackCamera: Boolean(backCameraDevice),
    hasFrontCamera: Boolean(frontCameraDevice),
  });
  const objectOutput = useObjectOutput({
    types: ['qr'],
    onObjectsScanned(objects) {
      const code = objects.find(isScannedCode);
      if (code?.value) {
        onScanned(code.value);
      }
    },
  });

  if (previewState.mode === 'fallback') {
    return (
      <View style={styles.placeholder}>
        <Icon name="qr" color={colors.primary.light} size={44} />
        <Typography variant="caption" style={styles.placeholderText}>
          {'No camera is available here. If you are on the iOS Simulator, use manual token entry or test live scanning on a physical iPhone.'}
        </Typography>
      </View>
    );
  }

  const cameraDevice = previewState.lens === 'back' ? backCameraDevice : frontCameraDevice;

  if (!cameraDevice) {
    return null;
  }

  return (
    <View style={styles.cameraViewport}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={cameraDevice}
        isActive
        outputs={[objectOutput]}
      />
      <View pointerEvents="none" style={styles.cameraOverlay}>
        <View style={styles.scanFrame} />
        {previewState.lens === 'front' ? (
          <Typography variant="caption" style={styles.overlayNote}>
            Using the front camera because a back camera is not available on this device.
          </Typography>
        ) : null}
        <Typography variant="caption" style={styles.overlayText}>
          Align the QR inside the frame
        </Typography>
      </View>
    </View>
  );
}

export const ScannerScreen = () => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const { hasPermission, requestPermission, canRequestPermission } = useCameraPermission();

  const [token, setToken] = useState('');
  const [scannerEnabled, setScannerEnabled] = useState(false);
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

  const handleProcessToken = async (rawToken: string) => {
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
        ? t('Security.validPass', 'Valid Pass')
        : t('Security.invalidPass', 'Invalid Pass');
      const detail = isValid && vr
        ? `${vr.visitorName} • Unit ${vr.unit?.unitNumber ?? t('Common.notAvailable', { defaultValue: 'N/A' })}`
        : t('Security.invalidToken', 'Invalid token');

      setScanResult({
        valid: isValid,
        scanOutcome: result.result,
        visitorStatus: vr?.status,
        visitorName: vr?.visitorName,
        visitorRequestId: vr?.id,
        unitNumber: vr?.unit?.unitNumber,
        message: isValid
          ? `Valid pass for ${vr?.visitorName}`
          : `Invalid or expired pass`,
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
      const message = err.data?.message || t('Security.invalidToken', 'Invalid token');

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
        title: t('Security.invalidPass', 'Invalid Pass'),
        detail: message,
        scannedAt,
      }));
    } finally {
      setScannerEnabled(false);
      scanLockRef.current = false;
    }
  };

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
        arrive: t('Security.arrived', 'Visitor marked as arrived'),
        allow: t('Security.allowed', 'Visitor allowed entry'),
        deny: t('Security.denied', 'Visitor denied entry'),
        complete: t('Security.completeSuccess', 'Visit marked complete.'),
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
        message: err.data?.message || t('Security.actionFailed', 'Visitor action could not be completed.'),
      } : null);
    }
  };

  const handleRequestPermission = async () => {
    if (canRequestPermission) {
      await requestPermission();
      return;
    }

    await Linking.openSettings();
  };

  const canUseNativeScanner = Platform.OS === 'ios' && hasPermission && scannerEnabled;
  const surfaceColor = isDark ? colors.surface.dark : colors.surface.light;
  const borderColor = isDark ? colors.border.dark : colors.border.light;
  const availableActions = scanResult
    ? getScannerAvailableActions({
      scanResult: scanResult.scanOutcome,
      visitorStatus: scanResult.visitorStatus,
    })
    : [];

  return (
    <ScreenContainer scrollable style={styles.container}>
      <View style={styles.header}>
        <Typography variant="h1">{t('Security.scanner', 'QR Scanner')}</Typography>
        <Typography variant="caption" style={styles.subtitle}>
          {t('Security.scanHint', 'Scan a visitor QR code or enter the token manually')}
        </Typography>
      </View>

      <View style={[styles.cameraCard, { backgroundColor: surfaceColor, borderColor }]}>
        <View style={styles.cameraHeader}>
          <View>
            <Typography variant="label" style={styles.cameraTitle}>
              {t('Security.liveScanner', { defaultValue: 'Live scanner' })}
            </Typography>
            <Typography variant="caption" style={styles.cameraSubtitle}>
              {scannerEnabled
                ? t('Security.cameraOpen', { defaultValue: 'Camera is open. Scan one pass, review the result, then scan the next.' })
                : t('Security.cameraClosed', { defaultValue: 'Camera is closed until you are ready to scan.' })}
            </Typography>
          </View>
          {scannerEnabled ? (
            <Button
              title={t('Common.close', { defaultValue: 'Close' })}
              onPress={handleCloseScanner}
              variant="outline"
              style={styles.cameraHeaderButton}
            />
          ) : (
            <Button
              title={t('Security.openScanner', { defaultValue: 'Open QR camera' })}
              onPress={handleReset}
              style={styles.cameraHeaderButton}
            />
          )}
        </View>
        {Platform.OS !== 'ios' ? (
          <View style={styles.placeholder}>
            <Icon name="qr" color={colors.primary.light} size={44} />
            <Typography variant="caption" style={styles.placeholderText}>
              {t('Security.iosScannerOnly', { defaultValue: 'Live QR scanning is currently enabled on iPhone. Manual token entry still works below.' })}
            </Typography>
          </View>
        ) : !hasPermission ? (
          <View style={styles.placeholder}>
            <Icon name="camera" color={colors.primary.light} size={44} />
            <Typography variant="caption" style={styles.placeholderText}>
              {t('Security.cameraPermissionNeeded', { defaultValue: 'Camera access is required to scan visitor QR passes.' })}
            </Typography>
            <Button
              title={canRequestPermission
                ? t('Security.enableCamera', { defaultValue: 'Enable Camera' })
                : t('Security.openSettings', { defaultValue: 'Open Settings' })}
              onPress={handleRequestPermission}
              style={styles.permissionButton}
            />
          </View>
        ) : canUseNativeScanner ? (
          <IOSScannerPreview onScanned={(value) => { void handleProcessToken(value); }} />
        ) : (
          <View style={styles.placeholder}>
            <Icon name="scanner" color={colors.primary.light} size={44} />
            <Typography variant="caption" style={styles.placeholderText}>
              {t('Security.scanAnotherHint', { defaultValue: 'Open the camera when the next visitor pass is ready.' })}
            </Typography>
            <Button
              title={t('Security.openScanner', { defaultValue: 'Open QR camera' })}
              onPress={handleReset}
              style={styles.permissionButton}
            />
          </View>
        )}
      </View>

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
            {scanResult.visitorStatus && (
              <Typography variant="body" style={styles.resultDetail}>
                {t('Security.currentStatus', 'Current status')}: {scanResult.visitorStatus.replace(/_/g, ' ')}
              </Typography>
            )}
            {scanResult.visitorRequestId && availableActions.length > 0 ? (
              <View style={styles.resultActions}>
                {availableActions.includes('arrive') ? (
                  <Button
                    title={t('Security.arrive', 'Mark Arrived')}
                    onPress={() => { void handleVisitorAction('arrive'); }}
                    variant="outline"
                    style={styles.resultActionButton}
                    loading={isPerforming}
                  />
                ) : null}
                {availableActions.includes('allow') ? (
                  <Button
                    title={t('Security.allow', 'Allow Entry')}
                    onPress={() => { void handleVisitorAction('allow'); }}
                    style={styles.resultActionButton}
                    loading={isPerforming}
                  />
                ) : null}
                {availableActions.includes('deny') ? (
                  <Button
                    title={t('Security.deny', 'Deny Entry')}
                    onPress={() => { void handleVisitorAction('deny'); }}
                    variant="outline"
                    style={[styles.resultActionButton, { borderColor: colors.error }]}
                    textStyle={{ color: colors.error }}
                    loading={isPerforming}
                  />
                ) : null}
                {availableActions.includes('complete') ? (
                  <Button
                    title={t('Security.complete', 'Complete')}
                    onPress={() => { void handleVisitorAction('complete'); }}
                    style={styles.resultActionButton}
                    loading={isPerforming}
                  />
                ) : null}
              </View>
            ) : null}
            <Button
              title={t('Security.scanAnother', 'Scan Another')}
              onPress={handleReset}
              style={styles.resetButton}
            />
          </View>
        </View>
      ) : null}

      <View style={styles.inputSection}>
        <Input
          label={t('Security.tokenLabel', 'Visitor QR pass token')}
          onChangeText={setToken}
          placeholder={t('Security.tokenPlaceholder', 'Paste or type QR token...')}
          value={token}
          containerStyle={styles.inputContainer}
        />
        <Button
          title={t('Security.validate', 'Validate')}
          onPress={handleManualValidate}
          loading={isValidating || isPerforming}
          style={styles.scanButton}
        />
      </View>

      {scanHistory.length > 0 ? (
        <View style={[styles.historyCard, { backgroundColor: surfaceColor, borderColor }]}>
          <Typography variant="h3" style={styles.historyTitle}>
            {t('Security.recentScans', { defaultValue: 'Recent QR scans' })}
          </Typography>
          {scanHistory.map((entry) => (
            <View key={entry.id} style={styles.historyRow}>
              <View style={[
                styles.historyDot,
                { backgroundColor: entry.status === 'valid' ? colors.success : colors.error },
              ]} />
              <View style={styles.historyText}>
                <Typography variant="label">{entry.title}</Typography>
                <Typography variant="caption" style={styles.historyDetail}>{entry.detail}</Typography>
              </View>
              <Typography variant="caption" style={styles.historyTime}>
                {new Date(entry.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Typography>
            </View>
          ))}
        </View>
      ) : null}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: layout.screenGutter,
  },
  header: {
    marginBottom: layout.sectionGap,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
  cameraCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
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
  overlayNote: {
    marginTop: spacing.md,
    color: '#fff',
    maxWidth: 240,
    textAlign: 'center',
  },
  inputSection: {
    marginBottom: layout.sectionGap,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  manualActions: {
    gap: spacing.sm,
  },
  scanButton: {
    width: '100%',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: layout.cardPadding,
    paddingBottom: spacing.xl,
  },
  placeholderText: {
    marginTop: spacing.md,
    textAlign: 'center',
  },
  permissionButton: {
    marginTop: spacing.lg,
    minWidth: 180,
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
    marginBottom: spacing.xs,
  },
  resultActions: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  resultActionButton: {
    width: '100%',
  },
  resetButton: {
    marginTop: spacing.md,
    width: '100%',
  },
  historyCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: layout.cardPadding,
    marginTop: spacing.sm,
    ...shadows.sm,
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
