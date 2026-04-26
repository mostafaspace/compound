import React from 'react';
import { 
  Pressable, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  ViewStyle, 
  TextStyle, 
  useColorScheme,
  StyleProp
} from 'react-native';
import { colors, spacing } from '../../theme';

interface ButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const Button: React.FC<ButtonProps> = ({
  onPress,
  title,
  variant = 'primary',
  disabled,
  loading,
  style,
  textStyle,
}) => {
  const isDark = useColorScheme() === 'dark';
  
  const getButtonStyle = () => {
    const base: any[] = [styles.button];
    if (style) base.push(style);
    
    if (disabled || loading) {
      base.push(styles.disabled);
    }
    
    switch (variant) {
      case 'primary':
        base.push({ backgroundColor: isDark ? colors.primary.dark : colors.primary.light });
        break;
      case 'secondary':
        base.push({ backgroundColor: isDark ? colors.surface.dark : colors.surface.light, borderWidth: 1, borderColor: isDark ? colors.border.dark : colors.border.light });
        break;
      case 'outline':
        base.push({ backgroundColor: 'transparent', borderWidth: 1, borderColor: isDark ? colors.primary.dark : colors.primary.light });
        break;
      case 'ghost':
        base.push({ backgroundColor: 'transparent' });
        break;
    }
    
    return base;
  };

  const getTextStyle = () => {
    const base: any[] = [styles.text];
    if (textStyle) base.push(textStyle);
    
    if (variant === 'primary') {
      base.push({ color: isDark ? colors.surface.dark : '#ffffff' });
    } else if (variant === 'outline' || variant === 'ghost') {
      base.push({ color: isDark ? colors.primary.dark : colors.primary.light });
    } else {
      base.push({ color: isDark ? colors.text.primary.dark : colors.text.primary.light });
    }
    
    return base;
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        ...getButtonStyle(),
        pressed && styles.pressed
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#ffffff' : (isDark ? colors.primary.dark : colors.primary.light)} />
      ) : (
        <Text style={getTextStyle()}>{title}</Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
});
