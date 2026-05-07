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
import { useTranslation } from 'react-i18next';
import { colors, spacing, radii, componentSize } from '../../theme';
import { Icon } from './Icon';
import { Typography } from './Typography';
import { isRtlLanguage, textDirectionStyle } from '../../i18n/direction';

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
  const { i18n } = useTranslation();
  const [hidden, setHidden] = useState(true);
  const isPassword = secureTextEntry !== undefined;
  const isRtl = isRtlLanguage(i18n.language);
  const surfaceColor = isDark ? colors.surface.dark : colors.surface.light;
  const mutedSurface = isDark ? colors.surfaceMuted.dark : colors.surfaceMuted.light;
  const textColor = isDark ? colors.text.primary.dark : colors.text.primary.light;
  const mutedColor = isDark ? colors.text.secondary.dark : colors.text.secondary.light;
  const borderColor = error ? colors.error : (isDark ? colors.border.dark : colors.border.light);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Typography variant="label" style={[styles.label, textDirectionStyle(isRtl)]}>{label}</Typography>}
      <View style={styles.inputWrapper}>
        <TextInput
          placeholderTextColor={mutedColor}
          secureTextEntry={isPassword ? hidden : undefined}
          style={[
            styles.input,
            isPassword && (isRtl ? styles.inputWithToggleRtl : styles.inputWithToggle),
            {
              backgroundColor: props.editable === false ? mutedSurface : surfaceColor,
              color: textColor,
              borderColor,
            },
            textDirectionStyle(isRtl),
            props.style
          ]}
          {...props}
        />
        {isPassword && (
          <Pressable
            onPress={() => setHidden((v) => !v)}
            style={[styles.eyeButton, isRtl ? styles.eyeButtonRtl : styles.eyeButtonLtr]}
            accessibilityLabel={hidden ? "Show password" : "Hide password"}
            accessibilityRole="button"
            hitSlop={8}
          >
            <Icon name={hidden ? 'eye' : 'eye-off'} color={mutedColor} size={20} />
          </Pressable>
        )}
      </View>
      {error && <Typography variant="error" style={[styles.error, textDirectionStyle(isRtl)]}>{error}</Typography>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    marginBottom: spacing.xs,
    marginStart: 4,
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
    paddingEnd: 48,
  },
  inputWithToggleRtl: {
    paddingStart: 48,
  },
  eyeButton: {
    position: 'absolute',
    minHeight: componentSize.touch,
    justifyContent: 'center',
    alignItems: 'center',
    width: componentSize.touch,
  },
  eyeButtonLtr: {
    end: spacing.sm,
  },
  eyeButtonRtl: {
    start: spacing.sm,
  },
  error: {
    marginTop: spacing.xs,
    marginStart: 4,
  },
});
