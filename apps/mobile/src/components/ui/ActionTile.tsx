import React from 'react';
import { StyleSheet, View, useColorScheme } from 'react-native';

import { colors, radii, spacing } from '../../theme';
import { Card } from './Card';
import { Icon, type AppIconName } from './Icon';
import { Typography } from './Typography';

type ActionTileProps = {
  title: string;
  icon: AppIconName;
  onPress?: () => void;
  subtitle?: string;
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  testID?: string;
};

const toneColor = {
  primary: colors.primary.light,
  success: colors.success,
  warning: colors.warning,
  danger: colors.error,
  info: colors.info,
  neutral: colors.secondary.light,
};

export function ActionTile({
  title,
  icon,
  onPress,
  subtitle,
  tone = 'primary',
  testID,
}: ActionTileProps) {
  const isDark = useColorScheme() === 'dark';
  const color = toneColor[tone];

  return (
    <Card
      onPress={onPress}
      style={styles.card}
      accessibilityLabel={title}
      testID={testID}
    >
      <View style={[styles.iconShell, { backgroundColor: isDark ? colors.surfaceMuted.dark : colors.surfaceMuted.light }]}>
        <Icon name={icon} color={color} size={24} />
      </View>
      <Typography variant="body" style={styles.title} numberOfLines={2}>
        {title}
      </Typography>
      {subtitle ? (
        <Typography variant="caption" style={styles.subtitle} numberOfLines={2}>
          {subtitle}
        </Typography>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexGrow: 1,
    flexBasis: '45%',
    minHeight: 136,
  },
  iconShell: {
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontWeight: '800',
  },
  subtitle: {
    marginTop: spacing.xs,
  },
});
