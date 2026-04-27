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
import { GuardNavigator } from './GuardNavigator';
import { colors } from '../theme';
import { linking } from './linking';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { CreateVisitorScreen } from '../features/visitors/screens/CreateVisitorScreen';
import { ShareVisitorPassScreen } from '../features/visitors/screens/ShareVisitorPassScreen';

const Stack = createStackNavigator<RootStackParamList>();

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

  const userRole = user?.role;
  const isSecurityGuard = userRole === "security_guard";

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!authToken ? (
          <Stack.Screen name="Auth" component={LoginScreen} />
        ) : isSecurityGuard ? (
          <Stack.Screen name="Guard" component={GuardNavigator} />
        ) : (
          <Stack.Group>
            <Stack.Screen name="Main" component={MainTabNavigator} />
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
