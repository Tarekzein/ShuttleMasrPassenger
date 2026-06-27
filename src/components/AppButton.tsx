import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacityProps 
} from 'react-native';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../theme';

interface AppButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function AppButton({ 
  label, 
  variant = 'primary', 
  size = 'md', 
  loading = false, 
  disabled, 
  leftIcon,
  rightIcon,
  style, 
  ...props 
}: AppButtonProps) {
  
  const getBgColor = () => {
    if (disabled && variant !== 'ghost') return COLORS.border;
    switch (variant) {
      case 'primary': return COLORS.primary;
      case 'secondary': return COLORS.background;
      case 'outline': return 'transparent';
      case 'ghost': return 'transparent';
    }
  };

  const getTextColor = () => {
    if (disabled && variant !== 'ghost') return COLORS.textMuted;
    switch (variant) {
      case 'primary': return COLORS.text; // Text is dark on yellow
      case 'secondary': return COLORS.text;
      case 'outline': return COLORS.primary;
      case 'ghost': return COLORS.textSecondary;
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'sm': return { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.lg };
      case 'md': return { paddingVertical: SPACING.md, paddingHorizontal: SPACING.xl };
      case 'lg': return { paddingVertical: SPACING.lg, paddingHorizontal: SPACING.xxl };
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: getBgColor() },
        variant === 'outline' && { borderWidth: 1.5, borderColor: disabled ? COLORS.border : COLORS.primary },
        getPadding(),
        style,
      ]}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <>
          {leftIcon && <React.Fragment>{leftIcon}</React.Fragment>}
          <Text style={[
            styles.label, 
            { color: getTextColor() },
            size === 'sm' && { fontSize: FONT_SIZE.sm },
            size === 'lg' && { fontSize: FONT_SIZE.lg },
          ]}>
            {label}
          </Text>
          {rightIcon && <React.Fragment>{rightIcon}</React.Fragment>}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: RADIUS.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  label: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
