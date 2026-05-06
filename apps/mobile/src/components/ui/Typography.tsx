import React from 'react';
import { Text, TextStyle, useColorScheme, StyleProp } from 'react-native';
import { colors, typography } from '../../theme';

interface TypographyProps {
  children: React.ReactNode;
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'label' | 'error';
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

export const Typography: React.FC<TypographyProps> = ({
  children,
  variant = 'body',
  style,
  numberOfLines,
}) => {
  const isDark = useColorScheme() === 'dark';
  
  const getBaseStyle = () => {
    const textColor = isDark ? colors.text.primary.dark : colors.text.primary.light;
    const mutedColor = isDark ? colors.text.secondary.dark : colors.text.secondary.light;

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
        return { ...typography.caption, color: mutedColor };
      case 'label':
        return { ...typography.label, color: isDark ? colors.primary.dark : colors.primary.light };
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
