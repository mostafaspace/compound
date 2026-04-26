import React from 'react';
import { Text, TextStyle, StyleSheet, useColorScheme, StyleProp } from 'react-native';
import { colors } from '../../theme';

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
        return { fontSize: 24, fontWeight: '800', color: textColor };
      case 'h2':
        return { fontSize: 20, fontWeight: '700', color: textColor };
      case 'h3':
        return { fontSize: 18, fontWeight: '600', color: textColor };
      case 'body':
        return { fontSize: 16, fontWeight: '400', color: textColor };
      case 'caption':
        return { fontSize: 12, fontWeight: '400', color: mutedColor };
      case 'label':
        return { fontSize: 12, fontWeight: '700', color: colors.primary.dark, textTransform: 'uppercase', letterSpacing: 0.5 };
      case 'error':
        return { fontSize: 14, fontWeight: '500', color: colors.error };
      default:
        return { fontSize: 16, color: textColor };
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
