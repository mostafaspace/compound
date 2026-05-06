const palette = {
  ink: {
    950: '#07111F',
    900: '#0F172A',
    800: '#1E293B',
    700: '#334155',
    600: '#475569',
    500: '#64748B',
    400: '#94A3B8',
    300: '#CBD5E1',
    200: '#E2E8F0',
    100: '#F1F5F9',
    50: '#F8FAFC',
  },
  blue: {
    700: '#1D4ED8',
    600: '#2563EB',
    500: '#3B82F6',
    100: '#DBEAFE',
    50: '#EFF6FF',
  },
  teal: {
    700: '#0F766E',
    600: '#0D9488',
    500: '#14B8A6',
    100: '#CCFBF1',
    50: '#F0FDFA',
  },
  emerald: {
    600: '#059669',
    500: '#10B981',
    100: '#D1FAE5',
    50: '#ECFDF5',
  },
  amber: {
    600: '#D97706',
    500: '#F59E0B',
    100: '#FEF3C7',
    50: '#FFFBEB',
  },
  red: {
    600: '#DC2626',
    500: '#EF4444',
    100: '#FEE2E2',
    50: '#FEF2F2',
  },
  white: '#FFFFFF',
  black: '#000000',
};

export const colors = {
  palette,
  primary: {
    light: palette.teal[700],
    dark: palette.teal[500],
  },
  secondary: {
    light: palette.ink[500],
    dark: palette.ink[400],
  },
  cta: {
    light: palette.blue[600],
    dark: palette.blue[500],
  },
  background: {
    light: '#F6F8F7',
    dark: palette.ink[950],
  },
  surface: {
    light: palette.white,
    dark: palette.ink[800],
  },
  surfaceMuted: {
    light: '#EEF4F2',
    dark: palette.ink[900],
  },
  text: {
    primary: {
      light: palette.ink[900],
      dark: palette.ink[50],
    },
    secondary: {
      light: palette.ink[600],
      dark: palette.ink[300],
    },
    inverse: palette.white,
  },
  border: {
    light: '#DDE6E2',
    dark: palette.ink[700],
  },
  error: palette.red[500],
  success: palette.emerald[500],
  warning: palette.amber[500],
  info: palette.blue[500],
  accent: palette.teal[600],
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  ms: 12,
  md: 16,
  ml: 20,
  lg: 24,
  xl: 32,
  xxl: 40,
  '2xl': 48,
  '3xl': 64,
};

export const radii = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
};

export const typography = {
  display: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '800' as const,
  },
  h1: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '800' as const,
  },
  h2: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '700' as const,
  },
  h3: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '700' as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as const,
  },
  bodyStrong: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700' as const,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500' as const,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800' as const,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
  },
};

export const componentSize = {
  touch: 44,
  input: 56,
  button: 56,
  tabBar: 68,
};

export const layout = {
  screenGutter: spacing.md,
  screenTop: spacing.md,
  screenBottom: spacing.xl,
  sectionGap: spacing.lg,
  cardPadding: spacing.md,
  cardGap: spacing.md,
  listGap: spacing.md,
  heroPadding: spacing.lg,
  fabInset: spacing.md,
};

export const shadows = {
  sm: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 3,
  },
  lg: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.09,
    shadowRadius: 22,
    elevation: 6,
  },
  premium: {
    shadowColor: palette.teal[700],
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.11,
    shadowRadius: 24,
    elevation: 8,
  }
};

export const glass = {
  light: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderColor: 'rgba(226, 232, 240, 0.5)',
    borderWidth: 1,
  },
  dark: {
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
  },
};

export const opacity = {
  disabled: 0.45,
  pressed: 0.88,
  overlay: 0.58,
};

export const theme = {
  colors,
  spacing,
  radii,
  typography,
  componentSize,
  layout,
  shadows,
  glass,
  opacity,
};

export type AppTheme = typeof theme;
