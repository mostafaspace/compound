export const colors = {
  primary: {
    light: '#2563EB', // Professional Blue
    dark: '#3B82F6',  // Lighter blue for dark mode
  },
  secondary: {
    light: '#64748B', // Slate 500
    dark: '#94A3B8',  // Slate 400
  },
  cta: {
    light: '#2563EB', // Blue
    dark: '#3B82F6',
  },
  background: {
    light: '#F8FAFC', // Slate 50
    dark: '#0F172A',  // Slate 900
  },
  surface: {
    light: '#FFFFFF',
    dark: '#1E293B',  // Slate 800
  },
  text: {
    primary: {
      light: '#0F172A', // Slate 900
      dark: '#F8FAFC',  // Slate 50
    },
    secondary: {
      light: '#475569', // Slate 600
      dark: '#CBD5E1',  // Slate 300
    },
  },
  border: {
    light: '#E2E8F0', // Slate 200
    dark: '#334155',  // Slate 700
  },
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
  accent: '#0EA5E9', // Standardized Sky Blue
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  '2xl': 48,
  '3xl': 64,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
  },
  premium: {
    shadowColor: '#2563EB', // Professional Blue
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
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
