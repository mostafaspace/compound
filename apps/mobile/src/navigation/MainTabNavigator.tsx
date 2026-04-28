import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from 'react-native';
import { MainTabParamList } from './types';
import { DashboardScreen } from '../features/dashboard/screens/DashboardScreen';
import { VisitorsScreen } from '../features/visitors/screens/VisitorsScreen';
import { AccountsScreen } from '../features/finance/screens/AccountsScreen';
import { VotesScreen } from '../features/governance/screens/VotesScreen';
import { PollsScreen } from '../features/polls/screens/PollsScreen';
import { MoreNavigator } from './MoreNavigator';
import { colors, spacing } from '../theme';
import { usePermission } from '../hooks/usePermission';

// Placeholder for other screens
import { View, Text } from 'react-native';
const Placeholder = ({ name }: { name: string }) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>{name} Screen coming soon</Text>
  </View>
);

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabNavigator = () => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';

  const canViewVisitors = usePermission('view_visitors');
  const canViewFinance = usePermission('view_finance');
  const canViewGovernance = usePermission('view_governance');

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
          if (route.name === 'Finance') icon = '💳';
          if (route.name === 'Governance') icon = '⚖️';
          if (route.name === 'Polls') icon = '📊';
          if (route.name === 'More') icon = '•••';
          return <Text style={{ color, fontSize: 20 }}>{icon}</Text>;
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
      {canViewGovernance && (
        <Tab.Screen
          name="Governance"
          component={VotesScreen}
          options={{ title: t("Governance.label") }}
        />
      )}
      {canViewGovernance && (
        <Tab.Screen
          name="Polls"
          component={PollsScreen}
          options={{ title: "Polls" }}
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
