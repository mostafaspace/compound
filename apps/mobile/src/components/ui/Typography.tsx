import React from 'react';
import { Text, TextStyle, useColorScheme, StyleProp } from 'react-native';
import { colors, typography } from '../../theme';

interface TypographyProps {
  children: React.ReactNode;
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'label' | 'error';
  color?: 'primary' | 'secondary' | 'error' | 'success' | 'white';
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

export const Typography: React.FC<TypographyProps> = ({
  children,
  variant = 'body',
  color: colorProp,
  style,
  numberOfLines,
}) => {
  const isDark = useColorScheme() === 'dark';
  
  const getBaseStyle = () => {
    let textColor = isDark ? colors.text.primary.dark : colors.text.primary.light;
    const mutedColor = isDark ? colors.text.secondary.dark : colors.text.secondary.light;

    if (colorProp) {
      switch (colorProp) {
        case 'primary':
          textColor = isDark ? colors.primary.dark : colors.primary.light;
          break;
        case 'secondary':
          textColor = isDark ? colors.secondary.dark : colors.secondary.light;
          break;
        case 'error':
          textColor = colors.error;
          break;
        case 'success':
          textColor = colors.success;
          break;
        case 'white':
          textColor = colors.palette.white;
          break;
      }
    }

    switch (variant) {
      case 'h1':
        return { ...typography.h1, color: textColor };
      case 'h2':
        return { ...typography.h2, color: textColor };
      case 'h3':
        return { ...typography.h3, color: textColor };
      case 'body':
        return { ...typography.body, color: textColor };
      case 'caption':
        return { ...typography.caption, color: colorProp ? textColor : mutedColor };
      case 'label':
        return { ...typography.label, color: colorProp ? textColor : (isDark ? colors.primary.dark : colors.primary.light) };
      case 'error':
        return { fontSize: 14, lineHeight: 20, fontWeight: '600', color: colors.error };
      default:
        return { ...typography.body, color: textColor };
    }
  };

  return (
    <Text 
      style={[getBaseStyle() as TextStyle, style]} 
      numberOfLines={numberOfLines}
    >
      {children}
    </Text>
  );
};
