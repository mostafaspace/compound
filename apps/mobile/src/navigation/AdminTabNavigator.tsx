import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { useColorScheme, Text } from 'react-native';
import { AdminTabParamList } from './types';
import { AdminDashboardScreen } from '../features/admin/screens/AdminDashboardScreen';
import { VisitorsScreen } from '../features/visitors/screens/VisitorsScreen';
import { AccountsScreen } from '../features/finance/screens/AccountsScreen';
import { colors, spacing } from '../theme';

const Tab = createBottomTabNavigator<AdminTabParamList>();

export const AdminTabNavigator = () => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: colors.primary.dark,
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
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarIcon: ({ color, size }) => {
          let icon = '•';
          if (route.name === 'Dashboard') icon = '🏠';
          if (route.name === 'Visitors') icon = '👥';
          if (route.name === 'Finance') icon = '💰';
          if (route.name === 'Units') icon = '🏢';
          if (route.name === 'Settings') icon = '⚙️';
          return <Text style={{ color, fontSize: 20 }}>{icon}</Text>;
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={AdminDashboardScreen}
        options={{ title: t('Admin.dashboard', 'Dashboard') }}
      />
      <Tab.Screen
        name="Visitors"
        component={VisitorsScreen}
        options={{ title: t('Visitors.label', 'Visitors') }}
      />
      <Tab.Screen
        name="Finance"
        component={AccountsScreen}
        options={{ title: t('Finance.label', 'Finance') }}
      />
      <Tab.Screen
        name="Units"
        component={AdminDashboardScreen}
        options={{ title: t('Admin.units', 'Units') }}
      />
      <Tab.Screen
        name="Settings"
        component={AdminDashboardScreen}
        options={{ title: t('Common.settings', 'Settings') }}
      />
    </Tab.Navigator>
  );
};
