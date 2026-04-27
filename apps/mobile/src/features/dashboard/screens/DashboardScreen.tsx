import React from 'react';
import { View, StyleSheet, useColorScheme, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import { selectCurrentUser, logout as logoutAction } from '../../../store/authSlice';
import { colors, spacing, shadows } from '../../../theme';
import { Button } from '../../../components/ui/Button';
import { Typography } from '../../../components/ui/Typography';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import * as Keychain from "react-native-keychain";

const authTokenService = "compound.mobile.authToken";
const visitorTokenService = "compound.mobile.visitorPassTokens";

export const DashboardScreen = () => {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const user = useSelector(selectCurrentUser);
  const dispatch = useDispatch();

  const handleSignOut = async () => {
    await Keychain.resetGenericPassword({ service: authTokenService });
    await Keychain.resetGenericPassword({ service: visitorTokenService });
    dispatch(logoutAction());
  };

  if (!user) return null;

  return (
    <ScreenContainer scrollable>
      <View style={styles.header}>
        <View>
          <Typography variant="label" style={styles.brand}>{t("App.brand")}</Typography>
          <Typography variant="h1" style={styles.title}>{t("App.title")}</Typography>
        </View>
        <View style={styles.avatarPlaceholder}>
          <Typography style={{ color: '#FFF', fontWeight: 'bold' }}>{user.name.charAt(0)}</Typography>
        </View>
      </View>

      <View style={[styles.welcomePanel, { backgroundColor: isDark ? colors.surface.dark : colors.surface.light, borderColor: isDark ? colors.border.dark : colors.border.light }]}>
        <View style={styles.welcomeInfo}>
          <Typography variant="h2">{t("Dashboard.welcome", { name: user.name.split(' ')[0] })} 👋</Typography>
          <Typography style={styles.userRole}>
            {t(`Common.roles.${user.role}`, { defaultValue: user.role })}
          </Typography>
        </View>
        <View style={styles.badge}>
          <Typography variant="caption" style={{ color: colors.primary.light, fontWeight: '700' }}>{t("Common.verified", "Verified")}</Typography>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Typography variant="h3" style={styles.sectionTitle}>{t("QuickActions.label", "Quick Actions")}</Typography>
          <TouchableOpacity>
            <Typography variant="caption" style={{ color: colors.primary.light, fontWeight: '600' }}>{t("Common.viewAll", "View All")}</Typography>
          </TouchableOpacity>
        </View>
        
        <View style={styles.grid}>
          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: isDark ? colors.surface.dark : '#E6FFFA' }]}
            onPress={() => navigation.navigate('Main', { screen: 'Visitors' })}
          >
            <View style={[styles.iconBox, { backgroundColor: colors.primary.light }]}>
              <Typography style={{ color: '#FFF' }}>QR</Typography>
            </View>
            <Typography variant="label" style={styles.actionLabel}>{t("Navigation.visitors")}</Typography>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionCard, { backgroundColor: isDark ? colors.surface.dark : '#EBF8FF' }]}>
            <View style={[styles.iconBox, { backgroundColor: colors.cta.light }]}>
              <Typography style={{ color: '#FFF' }}>$</Typography>
            </View>
            <Typography variant="label" style={styles.actionLabel}>{t("Navigation.finance")}</Typography>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionCard, { backgroundColor: isDark ? colors.surface.dark : '#F0FFF4' }]}>
            <View style={[styles.iconBox, { backgroundColor: colors.success }]}>
              <Typography style={{ color: '#FFF' }}>!</Typography>
            </View>
            <Typography variant="label" style={styles.actionLabel}>{t("Issues.label")}</Typography>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionCard, { backgroundColor: isDark ? colors.surface.dark : '#FFF5F5' }]}>
            <View style={[styles.iconBox, { backgroundColor: colors.warning }]}>
              <Typography style={{ color: '#FFF' }}>📣</Typography>
            </View>
            <Typography variant="label" style={styles.actionLabel}>{t("Navigation.more")}</Typography>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <Button 
          variant="ghost" 
          title={t("Auth.signOut")} 
          onPress={handleSignOut}
          style={styles.signOutButton}
          textStyle={{ color: colors.error }}
        />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.xs,
  },
  brand: {
    color: colors.primary.light,
    marginBottom: 2,
  },
  title: {
    fontSize: 28,
    letterSpacing: -1,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  welcomePanel: {
    padding: spacing.xl,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: spacing.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shadows.md,
  },
  welcomeInfo: {
    flex: 1,
  },
  userRole: {
    fontWeight: '600',
    color: '#718096',
    marginTop: spacing.xs,
  },
  badge: {
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xs,
  },
  sectionTitle: {
    color: colors.text.primary.light,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  actionCard: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: 24,
    padding: spacing.lg,
    justifyContent: 'space-between',
    ...shadows.sm,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    color: colors.text.primary.light,
    fontSize: 14,
  },
  footer: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  signOutButton: {
    width: '100%',
  }
});
