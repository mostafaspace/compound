import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from 'react-native';
import { MoreScreen } from '../features/more/screens/MoreScreen';
import { NotificationsScreen } from '../features/notifications/screens/NotificationsScreen';
import { AnnouncementsScreen } from '../features/announcements/screens/AnnouncementsScreen';
import { PropertyScreen } from '../features/property/screens/PropertyScreen';
import { OrgChartScreen } from '../features/orgchart/screens/OrgChartScreen';
import { MoreStackParamList } from './types';
import { colors } from '../theme';

const Stack = createStackNavigator<MoreStackParamList>();

export const MoreNavigator = () => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: isDark ? colors.surface.dark : colors.surface.light,
        },
        headerTintColor: isDark ? colors.text.primary.dark : colors.text.primary.light,
        headerBackTitle: "",
      }}
    >
      <Stack.Screen 
        name="MoreHome" 
        component={MoreScreen}
        options={{ title: t("Common.more", { defaultValue: "More" }) }}
      />
      <Stack.Screen 
        name="Notifications" 
        component={NotificationsScreen}
        options={{ title: t("Notifications.label") }}
      />
      <Stack.Screen 
        name="Announcements" 
        component={AnnouncementsScreen}
        options={{ title: t("Announcements.label") }}
      />
      <Stack.Screen
        name="Property"
        component={PropertyScreen}
        options={{ title: t("Property.label") }}
      />
      <Stack.Screen
        name="OrgChart"
        component={OrgChartScreen}
        options={{ title: t("OrgChart.label", { defaultValue: "Org Chart" }) }}
      />
      {/* Settings screen etc can be added here */}
    </Stack.Navigator>
  );
};
