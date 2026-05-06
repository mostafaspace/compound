import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { useColorScheme, View } from 'react-native';
import { AdminTabParamList } from './types';
import { AdminDashboardScreen } from '../features/admin/screens/AdminDashboardScreen';
import { VisitorsScreen } from '../features/visitors/screens/VisitorsScreen';
import { AdminFinanceScreen } from '../features/admin/screens/AdminFinanceScreen';
import { AdminUnitsScreen } from '../features/admin/screens/AdminUnitsScreen';
import { colors, componentSize, radii, spacing } from '../theme';
import { LogoutButton } from '../components/ui/LogoutButton';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { MoreNavigator } from './MoreNavigator';
import { Icon, type AppIconName } from '../components/ui/Icon';

const Tab = createBottomTabNavigator<AdminTabParamList>();

const tabIcons: Record<keyof AdminTabParamList, AppIconName> = {
  Dashboard: 'dashboard',
  Visitors: 'visitors',
  Finance: 'finance',
  Units: 'units',
  More: 'more',
};

export const AdminTabNavigator = () => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: isDark ? colors.cta.dark : colors.primary.light,
        tabBarInactiveTintColor: isDark ? colors.text.secondary.dark : colors.text.secondary.light,
        tabBarStyle: {
          backgroundColor: isDark ? colors.surface.dark : colors.surface.light,
          borderTopColor: isDark ? colors.border.dark : colors.border.light,
          paddingBottom: spacing.sm,
          paddingTop: spacing.xs,
          height: componentSize.tabBar,
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
          return (
            <View style={{ width: 32, height: 28, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={tabIcons[route.name]} color={color} size={size ?? 22} />
            </View>
          );
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
