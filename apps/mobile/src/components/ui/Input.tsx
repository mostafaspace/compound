import React from 'react';
import { 
  View, 
  TextInput, 
  Text, 
  StyleSheet, 
  TextInputProps, 
  useColorScheme,
  ViewStyle
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
  ...props
}) => {
  const isDark = useColorScheme() === 'dark';

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Typography variant="label" style={styles.label}>{label}</Typography>}
      <TextInput
        placeholderTextColor={isDark ? "#718096" : "#9ca3af"}
        style={[
          styles.input,
          {
            backgroundColor: isDark ? "#2d3748" : "#f9fafb",
            color: isDark ? "#f9fafb" : "#111827",
            borderColor: error ? colors.error : (isDark ? "#4a5568" : "#d1d5db"),
          },
          props.style
        ]}
        {...props}
      />
      {error && <Typography variant="error" style={styles.error}>{error}</Typography>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    marginBottom: spacing.xs,
  },
  input: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    fontSize: 16,
  },
  error: {
    marginTop: spacing.xs,
  },
});
