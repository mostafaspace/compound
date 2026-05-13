import React from 'react';
import { 
  Pressable, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  ViewStyle, 
  TextStyle, 
  useColorScheme,
  StyleProp,
  View
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, shadows, radii, componentSize, opacity } from '../../theme';
import { Icon, type AppIconName } from './Icon';
import { isRtlLanguage, rowDirectionStyle, centerTextDirectionStyle } from '../../i18n/direction';

interface ButtonProps {
  onPress: () => void;
  title?: string;
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'success' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
  accessibilityLabel?: string;
  leftIcon?: AppIconName;
  rightIcon?: AppIconName;
}

export const Button: React.FC<ButtonProps> = ({
  onPress,
  title,
  children,
  variant = 'primary',
  disabled,
  loading,
  style,
  textStyle,
  testID,
  accessibilityLabel,
  leftIcon,
  rightIcon,
}) => {
  const isDark = useColorScheme() === 'dark';
  const { i18n } = useTranslation();
  const isRtl = isRtlLanguage(i18n.language);
  const resolvedRightIcon = rightIcon;
  
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
          ...shadows.premium,
        });
        break;
      case 'secondary':
        base.push({ 
          backgroundColor: isDark ? colors.surfaceMuted.dark : colors.surface.light,
          borderWidth: 1, 
          borderColor: isDark ? colors.border.dark : colors.border.light,
          ...shadows.md,
        });
        break;
      case 'outline':
        base.push({ 
          backgroundColor: 'transparent', 
          borderWidth: 1.5, 
          borderColor: isDark ? colors.border.dark : colors.border.light,
        });
        break;
      case 'ghost':
        base.push({ backgroundColor: 'transparent' });
        break;
      case 'success':
        base.push({ 
          backgroundColor: colors.success,
          ...shadows.premium,
        });
        break;
      case 'danger':
        base.push({ 
          backgroundColor: colors.error,
          ...shadows.md,
        });
        break;
    }
    
    return base;
  };

  const getTextStyle = () => {
    const base: any[] = [styles.text];
    if (textStyle) base.push(textStyle);
    
    if (variant === 'primary' || variant === 'success' || variant === 'danger') {
      base.push({ color: colors.text.inverse });
    } else if (variant === 'outline' || variant === 'ghost') {
      base.push({ color: isDark ? colors.text.primary.dark : colors.text.primary.light });
    } else {
      base.push({ color: isDark ? colors.text.primary.dark : colors.text.primary.light });
    }
    
    return base;
  };

  const iconColor = (variant === 'primary' || variant === 'success' || variant === 'danger')
    ? colors.text.inverse
    : (isDark ? colors.text.primary.dark : colors.text.primary.light);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: Boolean(disabled || loading), busy: Boolean(loading) }}
      style={({ pressed }) => [
        ...getButtonStyle(),
        pressed && styles.pressed,
        pressed && { transform: [{ scale: 0.98 }] }
      ]}
    >
      {loading ? (
        <ActivityIndicator color={(variant === 'primary' || variant === 'success' || variant === 'danger') ? colors.text.inverse : (isDark ? colors.cta.dark : colors.cta.light)} />
      ) : (
        children || (
          <View style={[styles.content, rowDirectionStyle(isRtl)]}>
            {leftIcon ? <Icon name={leftIcon} color={iconColor} size={18} /> : null}
            {title && (
              <Text 
                style={[...getTextStyle(), centerTextDirectionStyle(isRtl)]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {title}
              </Text>
            )}
            {resolvedRightIcon ? <Icon name={resolvedRightIcon} color={iconColor} size={18} /> : null}
          </View>
        )
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: componentSize.button,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: opacity.pressed,
  },
  disabled: {
    opacity: opacity.disabled,
  },
});
