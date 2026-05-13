import React from 'react';
import { Text, TextStyle, useColorScheme, StyleProp } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, typography } from '../../theme';
import { useIsRtl } from '../../i18n/direction';

interface TypographyProps {
  children: React.ReactNode;
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'bodyStrong' | 'caption' | 'label' | 'error';
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
  const isRtl = useIsRtl();
  
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

      let base: TextStyle;
      switch (variant) {
        case 'h1':
          base = { ...typography.h1 };
          break;
        case 'h2':
          base = { ...typography.h2 };
          break;
        case 'h3':
          base = { ...typography.h3 };
          break;
        case 'body':
          base = { ...typography.body };
          break;
        case 'bodyStrong':
          base = { ...typography.body, fontWeight: '700' };
          break;
        case 'caption':
          base = { ...typography.caption };
          if (!colorProp) textColor = mutedColor;
          break;
        case 'label':
          base = { ...typography.label };
          if (!colorProp) textColor = isDark ? colors.primary.dark : colors.primary.light;
          break;
        case 'error':
          base = { fontSize: 14, lineHeight: 20, fontWeight: '600' };
          textColor = colors.error;
          break;
        default:
          base = { ...typography.body };
      }

      return {
        ...base,
        color: textColor,
        fontFamily: isRtl ? 'Cairo' : undefined,
        textAlign: 'auto',
        writingDirection: isRtl ? 'rtl' : 'ltr',
      };
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
