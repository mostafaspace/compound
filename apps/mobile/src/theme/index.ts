export const colors = {
  primary: {
    light: '#0F766E', // Teal 700
    dark: '#14B8A6',  // Teal 500
  },
  secondary: {
    light: '#14B8A6',
    dark: '#2DD4BF',
  },
  cta: {
    light: '#0369A1', // Professional Blue
    dark: '#0EA5E9',
  },
  background: {
    light: '#F0FDFA', // Ultra-light teal
    dark: '#010409',  // Near-black for OLED
  },
  surface: {
    light: '#FFFFFF',
    dark: '#0D1117',  // Deep surface
  },
  text: {
    primary: {
      light: '#134E4A', // Dark teal text
      dark: '#F0FDFA',  // Light teal text
    },
    secondary: {
      light: '#475569',
      dark: '#94A3B8',
    },
  },
  border: {
    light: '#CCFBF1',
    dark: '#1E293B',
  },
  error: '#E11D48',
  success: '#22C55E', // Next Point Earth
  warning: '#F97316', // Next Point Sun
  info: '#3B82F6',    // Next Point Air
  accent: '#06B6D4',  // Next Point Water
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
};

export const glass = {
  light: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 1,
  },
  dark: {
    backgroundColor: 'rgba(13, 17, 23, 0.75)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
  },
};
