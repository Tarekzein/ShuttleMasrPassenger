export const COLORS = {
  // Brand
  primary: '#F4C400',
  primaryLight: '#FFF4CC',
  primaryDark: '#D4AA00',
  
  // Backgrounds
  background: '#F7F7F7',
  card: '#FFFFFF',
  
  // Typography
  text: '#111111',
  textSecondary: '#777777',
  textMuted: '#A0A0A0',
  textInverse: '#FFFFFF',
  
  // Borders
  border: '#E5E5E5',
  borderLight: '#F0F0F0',
  
  // Semantic
  success: '#22C55E',
  successLight: '#DCFCE7',
  danger: '#E85D5D',
  dangerLight: '#FEE2E2',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  info: '#3B82F6',
  infoLight: '#DBEAFE',

  // Misc
  transparent: 'transparent',
  overlay: 'rgba(0, 0, 0, 0.4)',
  
  // Aliases for backward compatibility
  white: '#FFFFFF',
  black: '#000000',
  surface: '#FFFFFF', // Alias for card
  dangerBg: '#FEE2E2', // Alias for dangerLight
  successBg: '#DCFCE7', // Alias for successLight
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20, // For cards
  xxl: 24,
  full: 999, // For buttons & badges
} as const;

export const FONT_SIZE = {
  xs: 11,
  sm: 13,
  md: 15, // Body
  lg: 17,
  xl: 20,
  xxl: 24, // H2
  xxxl: 28, // H1
  display: 34,
} as const;

export const SHADOWS = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
} as const;
