import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { useColorScheme, Text } from 'react-native';
import { MainTabParamList } from './types';
import { ResidentDashboardScreen } from '../features/resident/screens/ResidentDashboardScreen';
import { VisitorsScreen } from '../features/visitors/screens/VisitorsScreen';
import { AccountsScreen } from '../features/finance/screens/AccountsScreen';
import { VotesScreen } from '../features/governance/screens/VotesScreen';
import { MoreNavigator } from './MoreNavigator';
import { colors, spacing } from '../theme';
import { LogoutButton } from '../components/ui/LogoutButton';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const ResidentTabNavigator = () => {
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
          if (route.name === 'Finance') icon = '💳';
          if (route.name === 'Governance') icon = '⚖️';
          if (route.name === 'More') icon = '•••';
          return <Text style={{ color, fontSize: 20 }}>{icon}</Text>;
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={ResidentDashboardScreen}
        options={{ title: t('Dashboard.title', { defaultValue: 'Dashboard' }) }}
      />
      <Tab.Screen
        name="Visitors"
        component={VisitorsScreen}
        options={{ title: t('Visitors.label') }}
      />
      <Tab.Screen
        name="Finance"
        component={AccountsScreen}
        options={{ title: t('Finance.label') }}
      />
      <Tab.Screen
        name="Governance"
        component={VotesScreen}
        options={{ title: t('Governance.label') }}
      />
      <Tab.Screen
        name="More"
        component={MoreNavigator}
        options={{
          title: t('Common.more', { defaultValue: 'More' }),
          headerShown: false,
        }}
      />
    </Tab.Navigator>
  );
};
