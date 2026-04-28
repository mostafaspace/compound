import React from 'react';
import { View, StyleSheet, useColorScheme, Appearance, Pressable, ColorSchemeName } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { Typography } from '../../../components/ui/Typography';
import { colors, spacing } from '../../../theme';

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

  const renderOption = (label: string, value: string, onPress: () => void) => (
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
      <Typography variant="body">{label}</Typography>
      <Typography variant="caption" style={{ color: colors.cta.light, fontWeight: '600', fontSize: 14 }}>
        {value}
      </Typography>
    </Pressable>
  );

  return (
    <ScreenContainer style={styles.container}>
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
          !isDark ? '✓ Active' : 'Switch',
          () => setScheme('light')
        )}
        
        {renderOption(
          t('Settings.themeDark', { defaultValue: 'Dark Mode' }),
          isDark ? '✓ Active' : 'Switch',
          () => setScheme('dark')
        )}
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 0,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
    marginLeft: spacing.lg,
    color: colors.text.secondary.light,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  optionPressed: {
    opacity: 0.7,
  },
});
