import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../theme';

type StatusType = 
  | 'active' | 'live' | 'boarding' 
  | 'completed' | 'pending' | 'no-show' | 'boarded'
  | 'in_transit' | 'dropped_off' | 'cancelled'
  | 'PENDING' | 'BOARDED' | 'IN_TRANSIT' | 'DROPPED_OFF' | 'NO_SHOW' | 'CANCELLED';

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  dotOnly?: boolean; // Used for lists where it's a dot + text
}

export function StatusBadge({ status, label, dotOnly }: StatusBadgeProps) {
  const normalizedStatus = status
    .toLowerCase()
    .replace('no_show', 'no-show') as StatusType;

  const getStyles = () => {
    switch (normalizedStatus) {
      case 'active':
      case 'live':
        return { bg: COLORS.primary, text: COLORS.text, dot: COLORS.primary };
      case 'boarding':
        return { bg: COLORS.primaryLight, text: COLORS.text, dot: COLORS.primary };
      case 'completed':
      case 'dropped_off':
        return { bg: '#E6F4EA', text: '#137333', dot: '#137333' }; // Green success
      case 'in_transit':
        return { bg: '#E8F0FE', text: '#1A73E8', dot: '#1A73E8' }; // Soft Blue
      case 'boarded':
        return { bg: '#F4C40033', text: COLORS.text, dot: COLORS.primary }; // Soft Yellow
      case 'pending':
        return { bg: '#FEF7E0', text: '#B06000', dot: '#B06000' }; // Soft Amber/Yellow-Brown
      case 'no-show':
      case 'cancelled':
        return { bg: '#FCE8E6', text: '#C5221F', dot: '#C5221F' }; // Soft Red
      default:
        return { bg: COLORS.borderLight, text: COLORS.textSecondary, dot: COLORS.textSecondary };
    }
  };

  const s = getStyles();
  const text = label || normalizedStatus.replace('-', ' ').replace('_', ' ').toUpperCase();

  if (dotOnly) {
    return (
      <View style={[styles.dotContainer, normalizedStatus === 'boarded' && styles.boardedContainer]}>
        <View style={[styles.dot, { backgroundColor: s.dot }]} />
        <Text style={[styles.dotText, { color: s.text }]}>{text.toUpperCase()}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.text, { color: s.text }]}>{text.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dotContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.borderLight,
  },
  boardedContainer: {
    backgroundColor: 'transparent',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
