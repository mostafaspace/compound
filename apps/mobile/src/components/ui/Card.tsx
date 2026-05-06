import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle, useColorScheme } from 'react-native';

import { colors, radii, shadows, spacing } from '../../theme';

type CardProps = {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
};

export function Card({
  children,
  onPress,
  style,
  contentStyle,
  accessibilityLabel,
  testID,
}: CardProps) {
  const isDark = useColorScheme() === 'dark';
  const surfaceStyle = {
    backgroundColor: isDark ? colors.surface.dark : colors.surface.light,
    borderColor: isDark ? colors.border.dark : colors.border.light,
  };

  if (onPress) {
    return (
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        onPress={onPress}
        testID={testID}
        style={({ pressed }) => [
          styles.card,
          surfaceStyle,
          pressed && styles.pressed,
          style,
        ]}
      >
        <View style={contentStyle}>{children}</View>
      </Pressable>
    );
  }

  return (
    <View style={[styles.card, surfaceStyle, style]} testID={testID}>
      <View style={contentStyle}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.lg,
    ...shadows.sm,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
});
