import React from 'react';
import { View, StyleSheet, useColorScheme, Appearance, Pressable, ColorSchemeName } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { Typography } from '../../../components/ui/Typography';
import { colors, layout, radii, shadows, spacing } from '../../../theme';
import { Icon } from '../../../components/ui/Icon';

export const SettingsScreen = () => {
  const { t, i18n } = useTranslation();
  const isDark = useColorScheme() === 'dark';

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
  };

  const setScheme = (scheme: ColorSchemeName) => {
    Appearance.setColorScheme(scheme);
  };

  const renderOption = (label: string, value: string, onPress: () => void, active = false) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionRow,
        {
          backgroundColor: isDark ? colors.surface.dark : colors.surface.light,
          borderColor: isDark ? colors.border.dark : colors.border.light,
        },
        pressed && styles.optionPressed,
      ]}
    >
      <View style={styles.optionTitleRow}>
        <View style={styles.iconBadge}>
          <Icon name="settings" color={colors.primary.light} size={20} />
        </View>
        <Typography variant="body" style={styles.optionLabel}>{label}</Typography>
      </View>
      <View style={[styles.valuePill, active && styles.valuePillActive]}>
        <Typography variant="caption" style={[styles.valueText, active && styles.valueTextActive]}>
          {value}
        </Typography>
      </View>
    </Pressable>
  );

  return (
    <ScreenContainer>
      <View style={styles.section}>
        <Typography variant="label" style={styles.sectionTitle}>
          {t('Settings.preferences', { defaultValue: 'PREFERENCES' })}
        </Typography>
        
        {renderOption(
          t('Settings.language', { defaultValue: 'Language' }),
          i18n.language === 'en' ? 'English' : 'العربية',
          toggleLanguage
        )}
      </View>

      <View style={styles.section}>
        <Typography variant="label" style={styles.sectionTitle}>
          {t('Settings.appearance', { defaultValue: 'APPEARANCE' })}
        </Typography>
        
        {renderOption(
          t('Settings.themeLight', { defaultValue: 'Light Mode' }),
          !isDark ? t('Common.active', { defaultValue: 'Active' }) : t('Common.switch', { defaultValue: 'Switch' }),
          () => setScheme('light'),
          !isDark
        )}
        
        {renderOption(
          t('Settings.themeDark', { defaultValue: 'Dark Mode' }),
          isDark ? t('Common.active', { defaultValue: 'Active' }) : t('Common.switch', { defaultValue: 'Switch' }),
          () => setScheme('dark'),
          isDark
        )}
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: layout.sectionGap,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
    color: colors.text.secondary.light,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: layout.cardPadding,
    borderWidth: 1,
    borderRadius: radii.xl,
    marginBottom: layout.listGap,
    gap: spacing.md,
    ...shadows.sm,
  },
  optionTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted.light,
  },
  optionLabel: {
    flex: 1,
  },
  valuePill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted.light,
  },
  valuePillActive: {
    backgroundColor: colors.palette.emerald[50],
  },
  valueText: {
    color: colors.text.secondary.light,
    fontWeight: '700',
  },
  valueTextActive: {
    color: colors.palette.emerald[600],
  },
  optionPressed: {
    opacity: 0.7,
  },
});
