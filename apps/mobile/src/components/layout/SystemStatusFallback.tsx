import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { selectLastError, setOfflineState } from '../../store/systemSlice';
import { colors, spacing, shadows } from '../../theme';
import { useTranslation } from 'react-i18next';

export const SystemStatusFallback = () => {
  const isDark = useColorScheme() === 'dark';
  const lastError = useSelector(selectLastError);
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const handleRetry = () => {
    // Just clear the offline state to allow the next request to trigger normally
    dispatch(setOfflineState({ isOffline: false }));
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? colors.background.dark : colors.background.light }]}>
      <View style={[styles.card, { 
        backgroundColor: isDark ? colors.surface.dark : colors.surface.light,
        borderColor: isDark ? colors.border.dark : colors.border.light,
      }]}>
        <View style={styles.iconContainer}>
          <Text style={styles.iconText}>📡</Text>
        </View>
        <Text style={[styles.title, { color: isDark ? colors.text.primary.dark : colors.text.primary.light }]}>
          {t('System.connectionError', 'Connection Error')}
        </Text>
        <Text style={[styles.message, { color: isDark ? colors.text.secondary.dark : colors.text.secondary.light }]}>
          {lastError || t('System.backendDownMessage', 'Our servers are currently unreachable. Please check your internet connection or try again later.')}
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
    borderRadius: 24,
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
  iconText: {
    fontSize: 40,
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
