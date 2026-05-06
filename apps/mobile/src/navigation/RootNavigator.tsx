import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet, useColorScheme } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { getEffectiveRoleType } from '@compound/contracts';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { selectCurrentToken, selectCurrentUser, selectIsRestoring } from '../store/authSlice';
import { RootStackParamList } from './types';
import { LoginScreen } from '../features/auth/screens/LoginScreen';
import { ResidentTabNavigator } from './ResidentTabNavigator';
import { AdminTabNavigator } from './AdminTabNavigator';
import { GuardNavigator } from './GuardNavigator';
import { colors } from '../theme';
import { linking } from './linking';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { CreateVisitorScreen } from '../features/visitors/screens/CreateVisitorScreen';
import { ShareVisitorPassScreen } from '../features/visitors/screens/ShareVisitorPassScreen';
import { PollDetailScreen } from '../features/polls/screens/PollDetailScreen';
import { AddEditIssueScreen } from '../features/issues/screens/AddEditIssueScreen';
import { IssueDetailScreen } from '../features/issues/screens/IssueDetailScreen';
import { UploadDocumentScreen } from '../features/documents/screens/UploadDocumentScreen';
import { AdminInvitationsScreen } from '../features/admin/screens/AdminInvitationsScreen';
import { CreateInvitationScreen } from '../features/admin/screens/CreateInvitationScreen';
import { AuditLogScreen } from '../features/admin/screens/AuditLogScreen';
import { AuditLogTimelineScreen } from '../features/admin/screens/AuditLogTimelineScreen';
import { CreateAnnouncementScreen } from '../features/announcements/screens/CreateAnnouncementScreen';
import { ScreenHeader } from '../components/layout/ScreenHeader';

const Stack = createStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const authToken = useSelector(selectCurrentToken);
  const user = useSelector(selectCurrentUser);
  const isRestoring = useSelector(selectIsRestoring);
  const roleType = getEffectiveRoleType(user);

  // Initialize push notifications
  usePushNotifications(!isRestoring);

  if (isRestoring) {
    return (
      <View style={[styles.center, { backgroundColor: isDark ? colors.background.dark : colors.background.light }]}>
        <ActivityIndicator size="large" color={colors.primary.dark} />
        <Text style={{ marginTop: 10, color: isDark ? colors.text.primary.dark : colors.text.primary.light }}>
          {t("Auth.restoring")}
        </Text>
      </View>
    );
  }
  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!authToken ? (
          <Stack.Screen name="Auth" component={LoginScreen} />
        ) : (
          <Stack.Group>
            {roleType === 'security' ? (
              <Stack.Screen name="Guard" component={GuardNavigator} />
            ) : roleType === 'admin' ? (
              <Stack.Screen name="Admin" component={AdminTabNavigator} />
            ) : (
              <Stack.Screen name="Main" component={ResidentTabNavigator} />
            )}
            <Stack.Screen
              name="CreateVisitor"
              component={CreateVisitorScreen}
              options={{
                headerShown: true,
                header: () => <ScreenHeader title={t("Visitors.createNew", "Invite Guest")} />
              }}
            />
            <Stack.Screen
              name="ShareVisitorPass"
              component={ShareVisitorPassScreen}
              options={{
                headerShown: true,
                header: () => <ScreenHeader title={t("Visitors.sharePass", "Visitor Pass")} />
              }}
            />
            <Stack.Screen
              name="PollDetail"
              component={PollDetailScreen}
              options={{
                headerShown: true,
                header: () => <ScreenHeader title={t("Polls.detail", "Poll Details")} />
              }}
            />
            <Stack.Screen
              name="AddEditIssue"
              component={AddEditIssueScreen}
              options={({ route }) => ({
                headerShown: true,
                header: () => (
                  <ScreenHeader 
                    title={route.params?.issue 
                      ? t("Issues.edit", { defaultValue: "Edit Issue" }) 
                      : t("Issues.create", { defaultValue: "Report Issue" })
                    } 
                  />
                )
              })}
            />
            <Stack.Screen
              name="IssueDetail"
              component={IssueDetailScreen}
              options={{
                headerShown: true,
                header: () => <ScreenHeader title={t("Issues.detail", { defaultValue: "Issue Details" })} />
              }}
            />
            <Stack.Screen
              name="UploadDocument"
              component={UploadDocumentScreen}
              options={{
                headerShown: true,
                header: () => <ScreenHeader title={t("Documents.upload", { defaultValue: "Upload Document" })} />
              }}
            />
            <Stack.Screen
              name="AdminInvitations"
              component={AdminInvitationsScreen}
              options={{
                headerShown: true,
                header: () => <ScreenHeader title={t("Admin.invitations", { defaultValue: "Invitations" })} />
              }}
            />
            <Stack.Screen
              name="CreateInvitation"
              component={CreateInvitationScreen}
              options={{
                headerShown: true,
                header: () => <ScreenHeader title={t("Admin.newInvitation", { defaultValue: "New Invitation" })} />
              }}
            />
            <Stack.Screen
              name="AuditLog"
              component={AuditLogScreen}
              options={{
                headerShown: true,
                header: () => <ScreenHeader title={t("Admin.auditLogs", { defaultValue: "Audit Logs" })} />
              }}
            />
            <Stack.Screen
              name="AuditLogTimeline"
              component={AuditLogTimelineScreen}
              options={{
                headerShown: true,
                header: () => <ScreenHeader title={t("Admin.timeline", { defaultValue: "Timeline" })} />
              }}
            />
            <Stack.Screen
              name="CreateAnnouncement"
              component={CreateAnnouncementScreen}
              options={{
                headerShown: true,
                header: () => <ScreenHeader title={t("Announcements.createNew", { defaultValue: "Create Announcement" })} />
              }}
            />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
