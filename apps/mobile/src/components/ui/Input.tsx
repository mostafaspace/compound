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
import { colors, spacing } from '../../theme';
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

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Typography variant="label" style={styles.label}>{label}</Typography>}
      <View style={styles.inputWrapper}>
        <TextInput
          placeholderTextColor={isDark ? "#718096" : "#9ca3af"}
          secureTextEntry={isPassword ? hidden : undefined}
          style={[
            styles.input,
            isPassword && styles.inputWithToggle,
            {
              backgroundColor: isDark ? "#2d3748" : "#f9fafb",
              color: isDark ? "#f9fafb" : "#111827",
              borderColor: error ? colors.error : (isDark ? "#4a5568" : "#d1d5db"),
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
            <Typography style={[styles.eyeIcon, { color: isDark ? '#94A3B8' : '#6B7280' }]}>
              {hidden ? '👁' : '👁‍🗨'}
            </Typography>
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
    height: 54,
    borderRadius: 16,
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
    right: 12,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    width: 32,
  },
  eyeIcon: {
    fontSize: 20,
  },
  error: {
    marginTop: spacing.xs,
    marginLeft: 4,
  },
});
