import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { useColorScheme, Text } from 'react-native';
import { GuardStackParamList } from './types';
import { GateScreen } from '../features/security/screens/GateScreen';
import { ScannerScreen } from '../features/security/screens/ScannerScreen';
import { InvitationsScreen } from '../features/security/screens/InvitationsScreen';
import { colors, spacing } from '../theme';
import { LogoutButton } from '../components/ui/LogoutButton';

const Tab = createBottomTabNavigator<GuardStackParamList>();

export const GuardNavigator = () => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: isDark ? colors.cta.dark : colors.primary.light,
        tabBarInactiveTintColor: isDark ? '#9ca3af' : '#6b7280',
        tabBarStyle: {
          backgroundColor: isDark ? colors.surface.dark : colors.surface.light,
          borderTopColor: isDark ? colors.border.dark : colors.border.light,
          paddingBottom: spacing.xs,
          height: 60,
        },
        headerStyle: {
          backgroundColor: isDark ? colors.surface.dark : colors.surface.light,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: isDark ? colors.border.dark : colors.border.light,
        },
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
          color: isDark ? colors.text.primary.dark : colors.text.primary.light,
        },
        headerRight: () => <LogoutButton />,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarIcon: ({ color, size }) => {
          let icon = '•';
          if (route.name === 'Gate') icon = '🏠';
          if (route.name === 'Scanner') icon = '📷';
          if (route.name === 'Invitations') icon = '📋';
          return <Text style={{ color, fontSize: 20 }}>{icon}</Text>;
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
    </Tab.Navigator>
  );
};
