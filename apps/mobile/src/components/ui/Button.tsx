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
        base.push({ 
          backgroundColor: isDark ? colors.cta.dark : colors.cta.light,
          shadowColor: isDark ? colors.cta.dark : colors.cta.light,
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.3,
          shadowRadius: 20,
          elevation: 8,
        });
        break;
      case 'secondary':
        base.push({ 
          backgroundColor: isDark ? colors.surface.dark : colors.surface.light, 
          borderWidth: 1, 
          borderColor: isDark ? colors.border.dark : colors.border.light,
          elevation: 1,
        });
        break;
      case 'outline':
        base.push({ 
          backgroundColor: 'transparent', 
          borderWidth: 1.5, 
          borderColor: isDark ? colors.text.primary.dark : colors.text.primary.light 
        });
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
      base.push({ color: '#ffffff' }); // White on Gold
    } else if (variant === 'outline' || variant === 'ghost') {
      base.push({ color: isDark ? colors.text.primary.dark : colors.text.primary.light });
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
        pressed && styles.pressed,
        pressed && { transform: [{ scale: 0.98 }] }
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#ffffff' : (isDark ? colors.cta.dark : colors.cta.light)} />
      ) : (
        <Text style={getTextStyle()}>{title}</Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 56,
    paddingHorizontal: spacing.xl,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  text: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  pressed: {
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.5,
  },
});
