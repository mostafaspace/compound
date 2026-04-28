import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from 'react-native';
import { MoreScreen } from '../features/more/screens/MoreScreen';
import { NotificationsScreen } from '../features/notifications/screens/NotificationsScreen';
import { AnnouncementsScreen } from '../features/announcements/screens/AnnouncementsScreen';
import { PropertyScreen } from '../features/property/screens/PropertyScreen';
import { OrgChartScreen } from '../features/orgchart/screens/OrgChartScreen';
import { SettingsScreen } from '../features/settings/screens/SettingsScreen';
import { IssuesScreen } from '../features/issues/screens/IssuesScreen';
import { DocumentsScreen } from '../features/documents/screens/DocumentsScreen';
import { VerificationStatusScreen } from '../features/verification/screens/VerificationStatusScreen';
import { PrivacySettingsScreen } from '../features/privacy/screens/PrivacySettingsScreen';
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
        name="Documents"
        component={DocumentsScreen}
        options={{ title: t("Documents.label", { defaultValue: "Documents" }) }}
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
    </Stack.Navigator>
  );
};
