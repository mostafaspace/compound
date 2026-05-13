import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { useColorScheme, View } from 'react-native';
import { GuardStackParamList } from './types';
import { GateScreen } from '../features/security/screens/GateScreen';
import { ScannerScreen } from '../features/security/screens/ScannerScreen';
import { InvitationsScreen } from '../features/security/screens/InvitationsScreen';
import { SettingsScreen } from '../features/settings/screens/SettingsScreen';
import { colors, componentSize, radii, spacing } from '../theme';
import { NotificationBell } from '../components/ui/NotificationBell';
import { Icon, type AppIconName } from '../components/ui/Icon';
import { LogoutButton } from '../components/ui/LogoutButton';
import { isRtlLanguage } from '../i18n/direction';

const Tab = createBottomTabNavigator<GuardStackParamList>();

const tabIcons: Record<keyof GuardStackParamList, AppIconName> = {
  Gate: 'gate',
  Scanner: 'qr',
  Invitations: 'visitors',
  Settings: 'settings',
};

export const GuardNavigator = () => {
  const { t, i18n } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const isRtl = isRtlLanguage(i18n.language);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: isDark ? colors.cta.dark : colors.cta.light,
        tabBarInactiveTintColor: isDark ? colors.text.secondary.dark : colors.text.secondary.light,
        tabBarStyle: {
          backgroundColor: isDark ? colors.surface.dark : colors.surface.light,
          borderTopColor: isDark ? colors.border.dark : colors.border.light,
          paddingBottom: spacing.sm,
          paddingTop: spacing.xs,
          height: componentSize.tabBar,
          flexDirection: isRtl ? 'row-reverse' : 'row',
          direction: isRtl ? 'rtl' : 'ltr',
        },
        headerStyle: {
          backgroundColor: isDark ? colors.surface.dark : colors.surface.light,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: isDark ? colors.border.dark : colors.border.light,
        },
        headerTitleStyle: {
          color: isDark ? colors.text.primary.dark : colors.text.primary.light,
          textAlign: 'auto',
        },
        headerRight: () => isRtl ? (
          <View style={{ paddingLeft: spacing.sm }}>
            <LogoutButton />
          </View>
        ) : <NotificationBell />,
        headerLeft: () => isRtl ? <NotificationBell /> : (
          <View style={{ paddingLeft: spacing.sm }}>
            <LogoutButton />
          </View>
        ),
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarIcon: ({ color, size }) => {
          return (
            <View style={{ width: 32, height: 28, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={tabIcons[route.name]} color={color} size={size ?? 22} />
            </View>
          );
        },
      })}
    >
      <Tab.Screen
        name="Gate"
        component={GateScreen}
        options={{ title: t('Security.gate', 'Gate') }}
      />
      <Tab.Screen
        name="Scanner"
        component={ScannerScreen}
        options={{ title: t('Security.scanner', 'Scanner') }}
      />
      <Tab.Screen
        name="Invitations"
        component={InvitationsScreen}
        options={{ title: t('Security.invitations', 'Invitations') }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: t('Common.settings', 'Settings') }}
      />
    </Tab.Navigator>
  );
};
