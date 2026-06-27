import React from 'react';
import { View, StyleSheet, ViewProps, TouchableOpacity } from 'react-native';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../theme';

interface AppCardProps extends ViewProps {
  children: React.ReactNode;
  onPress?: () => void;
  active?: boolean;
  noPadding?: boolean;
}

export function AppCard({ children, onPress, active, noPadding, style, ...props }: AppCardProps) {
  const cardStyles = [
    styles.card,
    active && styles.activeCard,
    noPadding && styles.noPadding,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity 
        style={cardStyles} 
        onPress={onPress} 
        activeOpacity={0.7} 
        {...props as any}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={cardStyles} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
    marginBottom: SPACING.md,
  },
  activeCard: {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },
  noPadding: {
    padding: 0,
  },
});
