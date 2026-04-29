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
import { CreateIssueScreen } from '../features/issues/screens/CreateIssueScreen';
import { IssueDetailScreen } from '../features/issues/screens/IssueDetailScreen';
import { UploadDocumentScreen } from '../features/documents/screens/UploadDocumentScreen';

const Stack = createStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const authToken = useSelector(selectCurrentToken);
  const user = useSelector(selectCurrentUser);
  const isRestoring = useSelector(selectIsRestoring);

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

  const roleType = getEffectiveRoleType(user);

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
            <Stack.Screen name="CreateVisitor" component={CreateVisitorScreen} />
            <Stack.Screen name="ShareVisitorPass" component={ShareVisitorPassScreen} />
            <Stack.Screen name="PollDetail" component={PollDetailScreen} />
            <Stack.Screen
              name="CreateIssue"
              component={CreateIssueScreen}
              options={{ headerShown: true, title: t("Issues.create", { defaultValue: "Report Issue" }) }}
            />
            <Stack.Screen
              name="IssueDetail"
              component={IssueDetailScreen}
              options={{ headerShown: true, title: t("Issues.detail", { defaultValue: "Issue Details" }) }}
            />
            <Stack.Screen
              name="UploadDocument"
              component={UploadDocumentScreen}
              options={{ headerShown: true, title: t("Documents.upload", { defaultValue: "Upload Document" }) }}
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
