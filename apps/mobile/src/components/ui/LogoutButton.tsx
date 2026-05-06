import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import * as Keychain from 'react-native-keychain';
import { logout } from '../../store/authSlice';
import { api } from '../../services/api';
import { Typography } from './Typography';
import { colors, componentSize, radii, spacing } from '../../theme';

const authTokenService = "compound.mobile.authToken";

export const LogoutButton = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const handleLogout = async () => {
    dispatch(logout());
    setTimeout(() => {
      dispatch(api.util.resetApiState());
    }, 100);
    try {
      await Keychain.resetGenericPassword({ service: authTokenService });
    } catch (e) {
      console.warn("Failed to clear keychain on logout", e);
    }
  };

  return (
    <Pressable 
      style={styles.container} 
      onPress={handleLogout}
      accessibilityRole="button"
      accessibilityLabel={t('Auth.logout', 'Logout')}
    >
      <Typography variant="label" style={styles.text}>
        {t('Auth.logout', 'Logout')}
      </Typography>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: componentSize.touch,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
  },
  text: {
    color: colors.error,
    fontWeight: '800',
  },
});
