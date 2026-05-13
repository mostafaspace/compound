import React from 'react';
import { View, StyleSheet, useColorScheme, Appearance, Pressable, ColorSchemeName } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { Typography } from '../../../components/ui/Typography';
import { colors, layout, radii, shadows, spacing } from '../../../theme';
import { Icon } from '../../../components/ui/Icon';
import { selectColorSchemePreference, setLanguagePreference } from '../../../store/systemSlice';
import { applyNativeDirection, isRtlLanguage, rowDirectionStyle, textDirectionStyle } from '../../../i18n/direction';
import { persistMobilePreferences } from '../../../i18n/preferences';

export const SettingsScreen = () => {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const isDark = useColorScheme() === 'dark';
  const colorScheme = useSelector(selectColorSchemePreference);
  const isArabic = i18n.language === 'ar';
  const isRtl = isRtlLanguage(i18n.language);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    applyNativeDirection(newLang);
    dispatch(setLanguagePreference(newLang));
    void i18n.changeLanguage(newLang);
    void persistMobilePreferences(newLang, colorScheme);
  };

  const setScheme = (scheme: ColorSchemeName) => {
    Appearance.setColorScheme(scheme);
  };

  const renderOption = (label: string, value: string, onPress: () => void, active = false) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionRow,
        rowDirectionStyle(isRtl),
        {
          backgroundColor: isDark ? colors.surface.dark : colors.surface.light,
          borderColor: isDark ? colors.border.dark : colors.border.light,
        },
        pressed && styles.optionPressed,
      ]}
    >
      <View style={[styles.optionTitleRow, rowDirectionStyle(isRtl)]}>
        <View style={styles.iconBadge}>
          <Icon name="settings" color={colors.primary.light} size={20} />
        </View>
        <Typography variant="body" style={[styles.optionLabel, textDirectionStyle(isRtl)]}>{label}</Typography>
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
        <Typography variant="label" style={[styles.sectionTitle, textDirectionStyle(isRtl)]}>
          {t('Settings.preferences')}
        </Typography>
        
        {renderOption(
          t('Settings.language'),
          i18n.language === 'en' ? 'English' : 'العربية',
          toggleLanguage
        )}
      </View>

      <View style={styles.section}>
        <Typography variant="label" style={[styles.sectionTitle, textDirectionStyle(isRtl)]}>
          {t('Settings.appearance')}
        </Typography>
        
        {renderOption(
          t('Settings.themeLight'),
          !isDark ? t('Common.active') : t('Common.switch'),
          () => setScheme('light'),
          !isDark
        )}
        
        {renderOption(
          t('Settings.themeDark'),
          isDark ? t('Common.active') : t('Common.switch'),
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
