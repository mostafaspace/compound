import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet, useColorScheme } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { selectCurrentToken, selectCurrentUser, selectIsRestoring } from '../store/authSlice';
import { RootStackParamList } from './types';
import { LoginScreen } from '../features/auth/screens/LoginScreen';
import { MainTabNavigator } from './MainTabNavigator';
import { ResidentTabNavigator } from './ResidentTabNavigator';
import { AdminTabNavigator } from './AdminTabNavigator';
import { GuardNavigator } from './GuardNavigator';
import { colors } from '../theme';
import { linking } from './linking';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { CreateVisitorScreen } from '../features/visitors/screens/CreateVisitorScreen';
import { ShareVisitorPassScreen } from '../features/visitors/screens/ShareVisitorPassScreen';

const Stack = createStackNavigator<RootStackParamList>();

const ADMIN_ROLES = ['super_admin', 'compound_admin', 'board_member', 'finance_reviewer', 'support_agent'];
const RESIDENT_ROLES = ['resident_owner', 'resident_tenant'];
const SECURITY_ROLES = ['security_guard'];

const getUserRoleType = (role?: string) => {
  if (SECURITY_ROLES.includes(role ?? '')) return 'security';
  if (ADMIN_ROLES.includes(role ?? '')) return 'admin';
  if (RESIDENT_ROLES.includes(role ?? '')) return 'resident';
  return 'resident'; // default fallback
};

export const RootNavigator = () => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const authToken = useSelector(selectCurrentToken);
  const user = useSelector(selectCurrentUser);
  const isRestoring = useSelector(selectIsRestoring);

  // Initialize push notifications
  usePushNotifications();

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

  const roleType = getUserRoleType(user?.role);

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!authToken ? (
          <Stack.Screen name="Auth" component={LoginScreen} />
        ) : roleType === 'security' ? (
          <Stack.Screen name="Guard" component={GuardNavigator} />
        ) : roleType === 'admin' ? (
          <Stack.Screen name="Admin" component={AdminTabNavigator} />
        ) : (
          <Stack.Group>
            <Stack.Screen name="Main" component={ResidentTabNavigator} />
            <Stack.Screen name="CreateVisitor" component={CreateVisitorScreen} />
            <Stack.Screen name="ShareVisitorPass" component={ShareVisitorPassScreen} />
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
