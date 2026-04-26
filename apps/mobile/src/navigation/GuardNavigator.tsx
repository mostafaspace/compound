import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from 'react-native';
import { GuardStackParamList } from './types';
import { GateScreen } from '../features/security/screens/GateScreen';
import { colors } from '../theme';

const Stack = createStackNavigator<GuardStackParamList>();

export const GuardNavigator = () => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: isDark ? colors.surface.dark : colors.surface.light,
        },
        headerTintColor: isDark ? colors.text.primary.dark : colors.text.primary.light,
      }}
    >
      <Stack.Screen 
        name="Gate" 
        component={GateScreen}
        options={{ title: t("Security.label") }}
      />
      {/* Add Scanner, Settings etc later */}
    </Stack.Navigator>
  );
};
