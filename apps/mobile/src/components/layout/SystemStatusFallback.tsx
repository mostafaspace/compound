import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useSelector, useDispatch } from 'react-redux';
import { selectConnectionStatus, selectLastError, setOfflineState } from '../../store/systemSlice';
import { colors, spacing, shadows, radii } from '../../theme';
import { useTranslation } from 'react-i18next';
import { Icon } from '../ui/Icon';
import { textDirectionStyle, useIsRtl } from '../../i18n/direction';

export const SystemStatusFallback = () => {
  const isDark = useColorScheme() === 'dark';
  const lastError = useSelector(selectLastError);
  const connectionStatus = useSelector(selectConnectionStatus);
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const isRtl = useIsRtl();
  const isNoInternet = connectionStatus === 'no_internet';

  const title = isNoInternet ? t('System.noInternetTitle') : t('System.serverUnavailableTitle');
  const message = lastError || (isNoInternet ? t('System.noInternetMessage') : t('System.backendDownMessage'));

  const handleRetry = async () => {
    const state = await NetInfo.fetch();

    if (state.isConnected === false || state.isInternetReachable === false) {
      dispatch(setOfflineState({ isOffline: true, reason: 'no_internet' }));
      return;
    }

    dispatch(setOfflineState({ isOffline: false }));
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? colors.background.dark : colors.background.light }]}>
      <View style={[styles.card, { 
        backgroundColor: isDark ? colors.surface.dark : colors.surface.light,
        borderColor: isDark ? colors.border.dark : colors.border.light,
      }]}>
        <View style={styles.iconContainer}>
          <Icon name={isNoInternet ? 'wifi-off' : 'alert'} color={colors.error} size={36} strokeWidth={2.4} />
        </View>
        <Text style={[styles.title, textDirectionStyle(isRtl), { color: isDark ? colors.text.primary.dark : colors.text.primary.light }]}>
          {title}
        </Text>
        <Text style={[styles.message, textDirectionStyle(isRtl), { color: isDark ? colors.text.secondary.dark : colors.text.secondary.light }]}>
          {message}
        </Text>
        
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: isDark ? colors.primary.dark : colors.primary.light }]} 
          onPress={handleRetry}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>{t('System.retry', 'Try Again')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    zIndex: 9999,
  },
  card: {
    width: '100%',
    padding: spacing.xl,
    borderRadius: radii.xl,
    borderWidth: 1,
    alignItems: 'center',
    ...shadows.md,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  button: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
