import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { logout } from '../../store/authSlice';
import { Typography } from './Typography';
import { colors, spacing } from '../../theme';

export const LogoutButton = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={() => dispatch(logout())}
    >
      <Typography variant="label" style={styles.text}>
        {t('Auth.logout', 'Logout')}
      </Typography>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  text: {
    color: colors.error,
    fontWeight: '600',
  },
});
