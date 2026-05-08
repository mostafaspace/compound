import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { MoreScreen } from '../features/more/screens/MoreScreen';
import { NotificationsScreen } from '../features/notifications/screens/NotificationsScreen';
import { AnnouncementsScreen } from '../features/announcements/screens/AnnouncementsScreen';
import { OrgChartScreen } from '../features/orgchart/screens/OrgChartScreenV2';
import { SettingsScreen } from '../features/settings/screens/SettingsScreen';
import { IssuesScreen } from '../features/issues/screens/IssuesScreen';
import { VerificationStatusScreen } from '../features/verification/screens/VerificationStatusScreen';
import { PrivacySettingsScreen } from '../features/privacy/screens/PrivacySettingsScreen';
import { PollsScreen } from '../features/polls/screens/PollsScreen';
import { MoreStackParamList } from './types';
import { ScreenHeader } from '../components/layout/ScreenHeader';

const Stack = createStackNavigator<MoreStackParamList>();

export const MoreNavigator = () => {
  const { t } = useTranslation();

  return (
    <Stack.Navigator
      screenOptions={{
        header: ({ options, route }) => {
          const title = options.headerTitle !== undefined 
            ? options.headerTitle 
            : options.title !== undefined 
              ? options.title 
              : route.name;
          
          return (
            <ScreenHeader 
              title={title as string} 
              showBack={route.name !== 'MoreHome'} 
            />
          );
        }
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
        name="OrgChart"
        component={OrgChartScreen}
        options={{ title: t("OrgChart.label", { defaultValue: "Org Chart" }) }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: t("Common.settings", { defaultValue: "Settings" }) }}
      />
      <Stack.Screen
        name="Issues"
        component={IssuesScreen}
        options={{ title: t("Issues.label", { defaultValue: "Issues & Complaints" }) }}
      />
      <Stack.Screen
        name="VerificationStatus"
        component={VerificationStatusScreen}
        options={{ title: t("Verification.label", { defaultValue: "Verification Status" }) }}
      />
      <Stack.Screen
        name="PrivacySettings"
        component={PrivacySettingsScreen}
        options={{ title: t("Privacy.label", { defaultValue: "Privacy & Consents" }) }}
      />
      <Stack.Screen
        name="Polls"
        component={PollsScreen}
        options={{ title: t("Polls.label", { defaultValue: "Polls" }) }}
      />
    </Stack.Navigator>
  );
};
