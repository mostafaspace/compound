import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { Text, useColorScheme } from 'react-native';
import { MainTabParamList } from './types';
import { DashboardScreen } from '../features/dashboard/screens/DashboardScreen';
import { VisitorsScreen } from '../features/visitors/screens/VisitorsScreen';
import { AccountsScreen } from '../features/finance/screens/AccountsScreen';
import { PollsScreen } from '../features/polls/screens/PollsScreen';
import { MoreNavigator } from './MoreNavigator';
import { colors, spacing } from '../theme';
import { usePermission } from '../hooks/usePermission';

const Tab = createBottomTabNavigator<MainTabParamList>();

const tabGlyphs: Record<keyof MainTabParamList, string> = {
  Dashboard: 'DB',
  Property: 'PR',
  Visitors: 'VI',
  Finance: 'FN',
  Polls: 'PL',
  More: 'MO',
};

export const MainTabNavigator = () => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';

  const canViewVisitors = usePermission('view_visitors');
  const canViewFinance = usePermission('view_finance');
  const canViewPolls = usePermission('view_governance');

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
          return <Text style={{ color, fontSize: 12, fontWeight: '800', letterSpacing: 1 }}>{tabGlyphs[route.name]}</Text>;
        },
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{ title: t("Dashboard.title", { defaultValue: "Dashboard" }) }}
      />
      {canViewVisitors && (
        <Tab.Screen
          name="Visitors"
          component={VisitorsScreen}
          options={{ title: t("Visitors.label") }}
        />
      )}
      {canViewFinance && (
        <Tab.Screen
          name="Finance"
          component={AccountsScreen}
          options={{ title: t("Finance.label") }}
        />
      )}
      {canViewPolls && (
        <Tab.Screen
          name="Polls"
          component={PollsScreen}
          options={{ title: t("Polls.label") }}
        />
      )}
      <Tab.Screen
        name="More" 
        component={MoreNavigator}
        options={{ 
          title: t("Common.more", { defaultValue: "More" }),
          headerShown: false
        }}
      />
    </Tab.Navigator>
  );
};
