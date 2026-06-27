import { StyleSheet, Text, View } from 'react-native';
import { COLORS, FONT_SIZE, SPACING } from '../theme';

interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: string;
}

export function EmptyState({ title, message, icon = 'SM' }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconBox}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 72,
    paddingHorizontal: SPACING.xl,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  iconText: {
    color: COLORS.primaryDark,
    fontWeight: '900',
    fontSize: FONT_SIZE.lg,
  },
  title: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.text,
    fontWeight: '800',
    textAlign: 'center',
  },
  message: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
