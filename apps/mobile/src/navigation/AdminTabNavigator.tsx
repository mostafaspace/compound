import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { useColorScheme, Text } from 'react-native';
import { AdminTabParamList } from './types';
import { AdminDashboardScreen } from '../features/admin/screens/AdminDashboardScreen';
import { VisitorsScreen } from '../features/visitors/screens/VisitorsScreen';
import { AdminFinanceScreen } from '../features/admin/screens/AdminFinanceScreen';
import { AdminUnitsScreen } from '../features/admin/screens/AdminUnitsScreen';
import { colors, spacing } from '../theme';
import { LogoutButton } from '../components/ui/LogoutButton';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { MoreNavigator } from './MoreNavigator';

const Tab = createBottomTabNavigator<AdminTabParamList>();

export const AdminTabNavigator = () => {
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
          if (route.name === 'Dashboard') icon = '🏠';
          if (route.name === 'Visitors') icon = '👥';
          if (route.name === 'Finance') icon = '💰';
          if (route.name === 'Units') icon = '🏢';
          if (route.name === 'More') icon = '•••';
          return <Text style={{ color, fontSize: 20 }}>{icon}</Text>;
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={AdminDashboardScreen}
        options={{ 
          title: t('Admin.dashboard', 'Dashboard'),
          header: () => <ScreenHeader title={t('Admin.dashboard', 'Dashboard')} showBack={false} rightElement={<LogoutButton />} />
        }}
      />
      <Tab.Screen
        name="Visitors"
        component={VisitorsScreen}
        options={{ 
          title: t('Visitors.qrLabel', 'Visitor QR'),
          header: () => <ScreenHeader title={t('Visitors.qrLabel', 'Visitor QR')} showBack={false} rightElement={<LogoutButton />} />
        }}
      />
      <Tab.Screen
        name="Finance"
        component={AdminFinanceScreen}
        options={{ 
          title: t('Finance.label', 'Finance'),
          header: () => <ScreenHeader title={t('Finance.label', 'Finance')} showBack={false} rightElement={<LogoutButton />} />
        }}
      />
      <Tab.Screen
        name="Units"
        component={AdminUnitsScreen}
        options={{ 
          title: t('Admin.units', 'Units'),
          header: () => <ScreenHeader title={t('Admin.units', 'Units')} showBack={false} rightElement={<LogoutButton />} />
        }}
      />
      <Tab.Screen
        name="More"
        component={MoreNavigator}
        options={{ 
          title: t('Common.more', 'More'), 
          headerShown: false 
        }}
      />
    </Tab.Navigator>
  );
};
