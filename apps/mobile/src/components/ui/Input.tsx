import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  useColorScheme,
  ViewStyle,
  Pressable
} from 'react-native';
import { colors, spacing, radii, componentSize } from '../../theme';
import { Icon } from './Icon';
import { Typography } from './Typography';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string | null;
  containerStyle?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  containerStyle,
  secureTextEntry,
  ...props
}) => {
  const isDark = useColorScheme() === 'dark';
  const [hidden, setHidden] = useState(true);
  const isPassword = secureTextEntry !== undefined;
  const surfaceColor = isDark ? colors.surface.dark : colors.surface.light;
  const mutedSurface = isDark ? colors.surfaceMuted.dark : colors.surfaceMuted.light;
  const textColor = isDark ? colors.text.primary.dark : colors.text.primary.light;
  const mutedColor = isDark ? colors.text.secondary.dark : colors.text.secondary.light;
  const borderColor = error ? colors.error : (isDark ? colors.border.dark : colors.border.light);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Typography variant="label" style={styles.label}>{label}</Typography>}
      <View style={styles.inputWrapper}>
        <TextInput
          placeholderTextColor={mutedColor}
          secureTextEntry={isPassword ? hidden : undefined}
          style={[
            styles.input,
            isPassword && styles.inputWithToggle,
            {
              backgroundColor: props.editable === false ? mutedSurface : surfaceColor,
              color: textColor,
              borderColor,
            },
            props.style
          ]}
          {...props}
        />
        {isPassword && (
          <Pressable
            onPress={() => setHidden((v) => !v)}
            style={styles.eyeButton}
            accessibilityLabel={hidden ? "Show password" : "Hide password"}
            accessibilityRole="button"
            hitSlop={8}
          >
            <Icon name={hidden ? 'eye' : 'eye-off'} color={mutedColor} size={20} />
          </Pressable>
        )}
      </View>
      {error && <Typography variant="error" style={styles.error}>{error}</Typography>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    marginBottom: spacing.xs,
    marginLeft: 4,
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    minHeight: componentSize.input,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
    fontWeight: '500',
  },
  inputWithToggle: {
    paddingRight: 48,
  },
  eyeButton: {
    position: 'absolute',
    right: spacing.sm,
    minHeight: componentSize.touch,
    justifyContent: 'center',
    alignItems: 'center',
    width: componentSize.touch,
  },
  error: {
    marginTop: spacing.xs,
    marginLeft: 4,
  },
});
