import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { useColorScheme, View } from 'react-native';
import { ApartmentsStackParamList, MainTabParamList } from './types';
import { DashboardScreen } from '../features/dashboard/screens/DashboardScreen';
import { VisitorsScreen } from '../features/visitors/screens/VisitorsScreen';
import { PollsScreen } from '../features/polls/screens/PollsScreen';
import { ApartmentsListScreen } from '../features/apartments/screens/ApartmentsListScreen';
import { ApartmentDetailScreen } from '../features/apartments/screens/ApartmentDetailScreen';
import { MoreNavigator } from './MoreNavigator';
import { colors, componentSize, radii, spacing } from '../theme';
import { usePermission } from '../hooks/usePermission';
import { NotificationBell } from '../components/ui/NotificationBell';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { Icon, type AppIconName } from '../components/ui/Icon';
import { isRtlLanguage } from '../i18n/direction';

const Tab = createBottomTabNavigator<MainTabParamList>();
const ApartmentsStack = createStackNavigator<ApartmentsStackParamList>();

const tabIcons: Record<keyof MainTabParamList, AppIconName> = {
  Dashboard: 'dashboard',
  Apartments: 'building',
  Visitors: 'visitors',
  Polls: 'polls',
  More: 'more',
};

function ApartmentsStackNavigator() {
  const { t } = useTranslation();

  return (
    <ApartmentsStack.Navigator
      screenOptions={{
        header: ({ options, route }) => (
          <ScreenHeader 
            title={(options.title ?? route.name) as string} 
            showBack={route.name !== 'ApartmentsList'} 
          />
        )
      }}
    >
      <ApartmentsStack.Screen
        name="ApartmentsList"
        component={ApartmentsListScreen}
        options={{ title: t('Navigation.units', { defaultValue: 'Units' }) }}
      />
      <ApartmentsStack.Screen
        name="ApartmentDetail"
        component={ApartmentDetailScreen}
        options={{ title: t('Apartments.detail', { defaultValue: 'Apartment Detail' }) }}
      />
    </ApartmentsStack.Navigator>
  );
}

export const ResidentTabNavigator = () => {
  const { t, i18n } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const isRtl = isRtlLanguage(i18n.language);
  const canViewPolls = usePermission('view_governance');

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
          fontWeight: '700',
          fontSize: 18,
          color: isDark ? colors.text.primary.dark : colors.text.primary.light,
          textAlign: 'auto',
        },
        headerRight: () => isRtl ? null : <NotificationBell />,
        headerLeft: () => isRtl ? <NotificationBell /> : null,
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
        component={DashboardScreen}
        options={{ 
          title: t('Dashboard.title', { defaultValue: 'Dashboard' }),
          header: () => <ScreenHeader title={t('Dashboard.title', { defaultValue: 'Dashboard' })} showBack={false} rightElement={<NotificationBell />} />
        }}
      />
      <Tab.Screen
        name="Apartments"
        component={ApartmentsStackNavigator}
        options={{
          title: t('Navigation.units', { defaultValue: 'Units' }),
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Visitors"
        component={VisitorsScreen}
        options={{ 
          title: t('Navigation.visitors', { defaultValue: 'Visitors' }),
          header: () => <ScreenHeader title={t('Navigation.visitors', { defaultValue: 'Visitors' })} showBack={false} rightElement={<NotificationBell />} />
        }}
      />
      {canViewPolls && (
        <Tab.Screen
          name="Polls"
          component={PollsScreen}
          options={{
            title: t('Polls.label'),
            header: () => <ScreenHeader title={t('Polls.label')} showBack={false} rightElement={<NotificationBell />} />
          }}
        />
      )}
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
